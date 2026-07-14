/**
 * Chord playback orchestration.
 *
 * Pipeline: resolve chord (elemental contrary root) -> computeTiltVoicedPitches
 * -> AudioEngine. Voicing is sampled at tap/settings time, not continuously
 * while the phone moves (see docs/movements-not-chords-tilt.md).
 *
 * Entry points:
 * - Pointer (diagram): applyChordWithBorrowing -> voiceAndPlay(fromPointer)
 * - Settings/borrowing: playAndDisplayChord -> voiceAndPlay
 *
 * Anchor modes (TiltVoicingEngine):
 * - tiltModeEnabled: contrary roll (bass can shift with voicing width)
 * - no-tilt controls: pivot roll (position sets the bass note)
 *
 * The anchor/tilt resolution math (buildAnchorKey, applySmoothestVoiceLeading,
 * etc.) lives in useVoicingAnchorResolution; the audio-dispatch and
 * post-audio state commit lives in usePlaybackCommit. This hook is the
 * orchestrator that decides which resolver applies and threads the result
 * through to a commit.
 */
import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import { chordManager, type Chord } from '../music/ChordManager';
import { type BorrowingState } from '../music/BorrowingLogic';
import {
  DEFAULT_NO_TILT_POSITION_LEVEL,
  DEFAULT_NO_TILT_VOICING_LEVEL,
  FLAT_TILT,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import {
  applyVoicingOverlays,
  type ElementalPlaybackResolution,
} from '../music/tiltVoicingPlayback';
import {
  resolveSmoothReanchorTilt,
  resolveSmoothestReanchorTilt,
} from '../music/playbackTiltResolution';
import { invalidateVoicingCache } from '../music/voicingCache';
import { audioEngine } from '../audio/AudioEngine';
import { unlockIosMediaChannel } from '../audio/iosMediaChannel';
import type { PlayStyle, VoiceLeadingMode } from '../music/sessionModes';
import { usesDeviceTilt } from '../music/sessionModes';
import { isElementalName, isOppositeElementNavigation, previousBassMidi, resolveElementalForNavigation, type ElementalName } from '../music/elementalRoot';
import {
  type NoTiltChordLockMaps,
} from '../music/noTiltChordLocks';
import {
  armNoTiltRevoiceSuppress,
  type NoTiltRevoiceSuppressState,
} from '../music/noTiltRevoiceSuppress';
import { useVoicingAnchorResolution } from './useVoicingAnchorResolution';
import { usePlaybackCommit } from './usePlaybackCommit';

interface UseChordPlaybackOptions {
  getBorrowingStateForChord: (
    chordName: string,
    currentGlobalState: BorrowingState
  ) => BorrowingState;
  borrowingStateRef: RefObject<BorrowingState>;
  setBorrowingState: (state: BorrowingState) => void;
  setSelectedChord: (chord: Chord | null) => void;
  /**
   * Sole writer is commitPlayback / empty-pitch path (not a selectedChord
   * mirror effect). Must update before deferred level setState flushes.
   */
  selectedChordNameRef: RefObject<string | null>;
  /**
   * Generation-based suppress for the ChordContext re-voice effect after
   * pointer commits (see noTiltRevoiceSuppress.ts).
   */
  suppressNoTiltRevoiceRef: RefObject<NoTiltRevoiceSuppressState>;
  rawTiltRef: RefObject<TiltSample>;
  noTiltVoicingLevelRef: RefObject<number>;
  noTiltPositionLevelRef: RefObject<number>;
  tonalCenterRef: RefObject<number>;
  voiceLeadingModeRef: RefObject<VoiceLeadingMode>;
  setNoTiltPositionLevel: (level: number) => void;
  noTiltLockMapsRef: RefObject<NoTiltChordLockMaps>;
  applyNoTiltLocksForChord: (chordName: string, deferSetState?: boolean) => void;
  clearNoTiltChordLocks: () => void;
  initialPlayStyle?: PlayStyle;
  hasPersistedSettings?: boolean;
}

interface PlaybackResolution {
  displayChord: Chord;
  elemental?: ElementalPlaybackResolution;
}

export function useChordPlayback({
  getBorrowingStateForChord,
  borrowingStateRef,
  setBorrowingState,
  setSelectedChord,
  selectedChordNameRef,
  suppressNoTiltRevoiceRef,
  rawTiltRef,
  noTiltVoicingLevelRef,
  noTiltPositionLevelRef,
  tonalCenterRef,
  voiceLeadingModeRef,
  setNoTiltPositionLevel,
  noTiltLockMapsRef,
  applyNoTiltLocksForChord,
  clearNoTiltChordLocks,
  initialPlayStyle = 'drone',
  hasPersistedSettings = false,
}: UseChordPlaybackOptions) {
  const [playStyle, setPlayStyle] = useState<PlayStyle>(initialPlayStyle);
  const [tiltModeEnabled, setTiltModeEnabled] = useState(false);
  const [activePitches, setActivePitches] = useState<(number | null)[]>([]);
  const [previousPlayedChord, setPreviousPlayedChord] = useState<Chord | null>(
    null
  );
  const [lastTapTilt, setLastTapTilt] = useState<TiltSample>(FLAT_TILT);
  const [lastCommittedPlaybackTilt, setLastCommittedPlaybackTilt] =
    useState<TiltSample>(FLAT_TILT);
  const [smoothBaseParallel, setSmoothBaseParallel] = useState(0);
  const [lastPlayedVoicingLabel, setLastPlayedVoicingLabel] = useState<
    string | null
  >(null);
  const [lastPlayedBassLabel, setLastPlayedBassLabel] = useState<
    string | null
  >(null);
  const [lastElementalPlayback, setLastElementalPlayback] = useState<
    ElementalPlaybackResolution | null
  >(null);

  const isPointerDownRef = useRef(false);
  const playStyleRef = useRef(initialPlayStyle);
  const tiltModeRef = useRef(tiltModeEnabled);
  const hasPersistedSettingsRef = useRef(hasPersistedSettings);
  /** Last *resolved* chord (elemental root applied). Drives contrary-motion chains. */
  const previousChordRef = useRef<Chord | null>(null);
  /** Mirror of activePitches for skipIfUnchanged without re-rendering. */
  const activePitchesRef = useRef<number[]>([]);
  /** Tilt sample locked at last diagram pointer trigger (tilt mode). */
  const playbackTiltRef = useRef<TiltSample>(FLAT_TILT);
  /** Neutral voiced MIDI spread for overlay borrow/mute edits. */
  const neutralVoicingRef = useRef<number[]>([]);
  /** Detect stale anchors when chord or register settings change. */
  const anchorKeyRef = useRef<string>('');
  /** Raw tilt at the tap that committed the previous chord. */
  const lastTapTiltRef = useRef<TiltSample>(FLAT_TILT);
  /** Resolved playback tilt at the last chord commit. */
  const lastCommittedPlaybackTiltRef = useRef<TiltSample>(FLAT_TILT);
  /** Winning parallel steps from smooth search (before pitch delta). */
  const smoothBaseParallelRef = useRef(0);
  /** No-tilt control levels at the previous chord commit. */
  const lastNoTiltVoicingLevelRef = useRef(DEFAULT_NO_TILT_VOICING_LEVEL);
  const lastNoTiltPositionLevelRef = useRef(DEFAULT_NO_TILT_POSITION_LEVEL);

  useEffect(() => {
    playStyleRef.current = playStyle;
  }, [playStyle]);

  useEffect(() => {
    tiltModeRef.current = tiltModeEnabled;
  }, [tiltModeEnabled]);

  useEffect(() => {
    hasPersistedSettingsRef.current = hasPersistedSettings;
  }, [hasPersistedSettings]);

  const {
    buildAnchorKey,
    computeNeutralVoicing,
    resolvePlaybackTilt,
    getBaselineTilt,
    getCurrentControlTilt,
    syncNoTiltPositionLevel,
    applySmoothestVoiceLeading,
    preserveSameChordSmoothestTilt,
    resolveSmoothPlaybackTiltForNavigation,
  } = useVoicingAnchorResolution({
    tiltModeRef,
    tonalCenterRef,
    rawTiltRef,
    noTiltVoicingLevelRef,
    noTiltPositionLevelRef,
    previousChordRef,
    playbackTiltRef,
    neutralVoicingRef,
    lastTapTiltRef,
    lastCommittedPlaybackTiltRef,
    smoothBaseParallelRef,
    lastNoTiltVoicingLevelRef,
    lastNoTiltPositionLevelRef,
    noTiltLockMapsRef,
    suppressNoTiltRevoiceRef,
    setNoTiltPositionLevel,
  });

  const { updateVoiceLeadingBaseline, commitPlayback } =
    usePlaybackCommit({
      playStyleRef,
      tiltModeRef,
      activePitchesRef,
      previousChordRef,
      selectedChordNameRef,
      suppressNoTiltRevoiceRef,
      rawTiltRef,
      lastTapTiltRef,
      lastCommittedPlaybackTiltRef,
      smoothBaseParallelRef,
      lastNoTiltVoicingLevelRef,
      lastNoTiltPositionLevelRef,
      voiceLeadingModeRef,
      borrowingStateRef,
      setBorrowingState,
      setSelectedChord,
      setPreviousPlayedChord,
      setLastElementalPlayback,
      setActivePitches,
      setLastPlayedVoicingLabel,
      setLastPlayedBassLabel,
      setLastCommittedPlaybackTilt,
      setLastTapTilt,
      setSmoothBaseParallel,
    });

  const resetVoiceLeadingSession = useCallback(() => {
    lastTapTiltRef.current = FLAT_TILT;
    setLastTapTilt(FLAT_TILT);
    lastCommittedPlaybackTiltRef.current = FLAT_TILT;
    setLastCommittedPlaybackTilt(FLAT_TILT);
    smoothBaseParallelRef.current = 0;
    setSmoothBaseParallel(0);
    setLastPlayedVoicingLabel(null);
    setLastPlayedBassLabel(null);
    setLastElementalPlayback(null);
    lastNoTiltVoicingLevelRef.current = DEFAULT_NO_TILT_VOICING_LEVEL;
    lastNoTiltPositionLevelRef.current = DEFAULT_NO_TILT_POSITION_LEVEL;
  }, []);

  const changePlayStyle = useCallback((style: PlayStyle) => {
    if (playStyleRef.current === style) {
      return;
    }
    playStyleRef.current = style;
    audioEngine.releaseActiveNotes();
    isPointerDownRef.current = false;
    previousChordRef.current = null;
    setPreviousPlayedChord(null);
    anchorKeyRef.current = '';
    neutralVoicingRef.current = [];
    invalidateVoicingCache();
    resetVoiceLeadingSession();
    setPlayStyle(style);
  }, [resetVoiceLeadingSession]);

  const enterTiltSession = useCallback(() => {
    tiltModeRef.current = true;
    setTiltModeEnabled(true);
    if (!hasPersistedSettingsRef.current) {
      playStyleRef.current = 'drone';
      setPlayStyle('drone');
    }
    clearNoTiltChordLocks();
    resetVoiceLeadingSession();
  }, [clearNoTiltChordLocks, resetVoiceLeadingSession]);

  const enterNoTiltSession = useCallback(() => {
    tiltModeRef.current = false;
    setTiltModeEnabled(false);
    if (!hasPersistedSettingsRef.current) {
      playStyleRef.current = 'drone';
      setPlayStyle('drone');
    }
    resetVoiceLeadingSession();
  }, [resetVoiceLeadingSession]);

  const resolveForPlayback = useCallback(
    (chord: Chord): PlaybackResolution => {
      return { displayChord: chord };
    },
    []
  );

  const resolveElementalAfterTilt = useCallback(
    (
      chord: Chord,
      playbackTilt: TiltSample,
      capturedPreviousBassMidi: number | undefined
    ): PlaybackResolution => {
      if (!isElementalName(chord.name)) {
        return { displayChord: chord };
      }
      const tonalCenter = tonalCenterRef.current;
      const octaveRange = chordManager.getOctaveRange();
      const anchor = usesDeviceTilt(tiltModeRef.current) ? 'contrary' : 'pivot';
      const resolved = resolveElementalForNavigation(
        chord,
        tonalCenter,
        octaveRange,
        previousChordRef.current,
        capturedPreviousBassMidi,
        playbackTilt,
        anchor
      );
      return {
        displayChord: resolved.chord,
        elemental: {
          rootPitchClass: resolved.rootPitchClass,
          homeMidi: resolved.homeMidi,
        },
      };
    },
    [tonalCenterRef]
  );

  const computeVoicedPitchesFromAnchor = useCallback(
    (
      displayChord: Chord,
      state: BorrowingState
    ): number[] => {
      if (neutralVoicingRef.current.length === 0) {
        return [];
      }
      return applyVoicingOverlays(
        neutralVoicingRef.current,
        displayChord,
        state
      );
    },
    []
  );

  const voiceAndPlay = useCallback(
    (
      chord: Chord,
      state: BorrowingState,
      options: {
        retrigger?: boolean;
        skipIfUnchanged?: boolean;
        fromPointer?: boolean;
        borrowingStateOverride?: BorrowingState;
      } = {}
    ) => {
      const { displayChord: inputChord } = resolveForPlayback(chord);
      const fromPointer = options.fromPointer ?? false;
      const capturedPreviousBassMidi = previousBassMidi(neutralVoicingRef.current);
      const tiltMode = tiltModeRef.current;
      const syncPositionLevel = fromPointer
        ? (effectiveParallel: number) =>
            syncNoTiltPositionLevel(effectiveParallel, true)
        : syncNoTiltPositionLevel;

      if (!usesDeviceTilt(tiltMode)) {
        applyNoTiltLocksForChord(inputChord.name, fromPointer);
      }

      let displayChord = inputChord;
      let elemental: ElementalPlaybackResolution | undefined;
      let playbackTilt = resolvePlaybackTilt(fromPointer);
      const anchorKey = buildAnchorKey(displayChord, playbackTilt);
      const needsReanchor =
        fromPointer || anchorKeyRef.current !== anchorKey;
      const isChordChange =
        previousChordRef.current !== null &&
        previousChordRef.current.name !== displayChord.name;
      const isFirstChord = previousChordRef.current === null;

      const isOppositeElement =
        isChordChange &&
        isElementalName(inputChord.name) &&
        previousChordRef.current !== null &&
        isOppositeElementNavigation(
          previousChordRef.current,
          inputChord.name as ElementalName
        );

      // Voice leading parallel adjustment (re-anchor only):
      // - root_position: baseline 0 at flat pitch (implicit in resolvePlaybackTilt)
      // - smooth: per-chord CHORD_FLAT_PARALLEL lookup + live tilt offset
      // - smoothest: live minimum-motion search vs previous voicing (+ session state)
      if (needsReanchor && voiceLeadingModeRef.current === 'smooth') {
        playbackTilt = resolveSmoothReanchorTilt(displayChord, tiltMode, {
          isChordChange,
          isFirstChord,
          isOppositeElement,
          previousChord: previousChordRef.current,
          lockMaps: noTiltLockMapsRef.current,
          noTiltVoicingLevel: noTiltVoicingLevelRef.current,
          noTiltPositionLevel: noTiltPositionLevelRef.current,
          lastNoTiltPositionLevel: lastNoTiltPositionLevelRef.current,
          resolveSmoothPlaybackTiltForNavigation,
          getCurrentControlTilt,
          syncNoTiltPositionLevel: syncPositionLevel,
        });
        if (tiltMode) {
          playbackTiltRef.current = playbackTilt;
        }
      } else if (
        needsReanchor &&
        voiceLeadingModeRef.current === 'smoothest'
      ) {
        playbackTilt = resolveSmoothestReanchorTilt(
          displayChord,
          playbackTilt,
          neutralVoicingRef.current.length,
          isChordChange,
          smoothBaseParallelRef,
          {
            applySmoothestVoiceLeading: (chord, elemental) =>
              applySmoothestVoiceLeading(chord, elemental, syncPositionLevel),
            preserveSameChordSmoothestTilt: (chordName) =>
              preserveSameChordSmoothestTilt(chordName, syncPositionLevel),
            getBaselineTilt,
            getCurrentControlTilt,
          }
        );
        if (tiltMode) {
          playbackTiltRef.current = playbackTilt;
        }
      }

      if (needsReanchor) {
        const elementalResolution = resolveElementalAfterTilt(
          inputChord,
          playbackTilt,
          capturedPreviousBassMidi
        );
        displayChord = elementalResolution.displayChord;
        elemental = elementalResolution.elemental;

        neutralVoicingRef.current = computeNeutralVoicing(
          displayChord,
          playbackTilt,
          elemental
        );
        anchorKeyRef.current = buildAnchorKey(
          displayChord,
          playbackTilt
        );
      }

      const pitches = computeVoicedPitchesFromAnchor(displayChord, state);

      if (pitches.length === 0) {
        previousChordRef.current = displayChord;
        activePitchesRef.current = [];
        selectedChordNameRef.current = displayChord.name;
        if (fromPointer) {
          armNoTiltRevoiceSuppress(suppressNoTiltRevoiceRef.current);
        }
        invalidateVoicingCache();
        updateVoiceLeadingBaseline(playbackTilt, fromPointer);
        audioEngine.releaseActiveNotes();
        setPreviousPlayedChord(displayChord);
        setSelectedChord(displayChord);
        setActivePitches([]);
        if (options.borrowingStateOverride) {
          borrowingStateRef.current = options.borrowingStateOverride;
          setBorrowingState(options.borrowingStateOverride);
        }
        return;
      }

      commitPlayback(displayChord, pitches, playbackTilt, state, elemental, options);
    },
    [
      resolveForPlayback,
      resolveElementalAfterTilt,
      resolveSmoothPlaybackTiltForNavigation,
      resolvePlaybackTilt,
      buildAnchorKey,
      getCurrentControlTilt,
      getBaselineTilt,
      syncNoTiltPositionLevel,
      applySmoothestVoiceLeading,
      preserveSameChordSmoothestTilt,
      computeNeutralVoicing,
      computeVoicedPitchesFromAnchor,
      commitPlayback,
      borrowingStateRef,
      setBorrowingState,
      selectedChordNameRef,
      setSelectedChord,
      updateVoiceLeadingBaseline,
      applyNoTiltLocksForChord,
      noTiltLockMapsRef,
      noTiltVoicingLevelRef,
      noTiltPositionLevelRef,
      voiceLeadingModeRef,
      suppressNoTiltRevoiceRef,
    ]
  );

  const playAndDisplayChord = useCallback(
    (chord: Chord, state: BorrowingState) => {
      voiceAndPlay(chord, state, {
        retrigger: false,
        skipIfUnchanged: true,
      });
    },
    [voiceAndPlay]
  );

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isPointerDownRef.current) {
        isPointerDownRef.current = false;
        if (playStyleRef.current === 'click_and_hold') {
          audioEngine.releaseActiveNotes();
        }
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  useEffect(() => {
    return audioEngine.registerReleaseListener(() => {
      isPointerDownRef.current = false;
    });
  }, []);

  const applyChordWithBorrowing = useCallback(
    (chord: Chord) => {
      const newState = getBorrowingStateForChord(
        chord.name,
        borrowingStateRef.current
      );
      voiceAndPlay(chord, newState, {
        retrigger:
          playStyleRef.current === 'drone' &&
          previousChordRef.current?.name === chord.name,
        fromPointer: true,
        borrowingStateOverride: newState,
      });
      return newState;
    },
    [
      getBorrowingStateForChord,
      borrowingStateRef,
      voiceAndPlay,
    ]
  );

  const handleChordPointerDown = useCallback((chord: Chord) => {
    unlockIosMediaChannel();
    isPointerDownRef.current = true;
    applyChordWithBorrowing(chord);
  }, [applyChordWithBorrowing]);

  const handleChordPointerUp = useCallback(() => {
    isPointerDownRef.current = false;
    if (playStyleRef.current === 'click_and_hold') {
      audioEngine.releaseActiveNotes();
    }
  }, []);

  const handleChordPointerEnter = useCallback((chord: Chord) => {
    if (isPointerDownRef.current) {
      applyChordWithBorrowing(chord);
    }
  }, [applyChordWithBorrowing]);

  return {
    playStyle,
    setPlayStyle: changePlayStyle,
    tiltModeEnabled,
    enterTiltSession,
    enterNoTiltSession,
    resetVoiceLeadingSession,
    activePitches,
    previousPlayedChord,
    lastTapTilt,
    lastCommittedPlaybackTilt,
    smoothBaseParallel,
    lastPlayedVoicingLabel,
    lastPlayedBassLabel,
    lastElementalPlayback,
    playAndDisplayChord,
    handleChordPointerDown,
    handleChordPointerUp,
    handleChordPointerEnter,
  };
}
