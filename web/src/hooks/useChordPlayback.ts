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
 * - tilt play style: contrary roll (bass can shift with voicing width)
 * - drone/no-tilt controls: pivot roll (position sets the bass note)
 */
import { useState, useEffect, useRef, useCallback, startTransition, type RefObject } from 'react';
import { chordManager, type Chord } from '../music/ChordManager';
import { type BorrowingState } from '../music/BorrowingLogic';
import {
  DEFAULT_NO_TILT_POSITION_LEVEL,
  DEFAULT_NO_TILT_VOICING_LEVEL,
  FLAT_TILT,
  mapTiltToPositions,
  MAX_TILT_PITCH_STEPS,
  noTiltLevelsFromTilt,
  noTiltPositionLevelFromParallelSteps,
  parallelLevelFromTilt,
  parallelStepsFromNoTiltPositionLevel,
  tiltSampleFromLevels,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import {
  applyVoicingOverlays,
  computeNeutralTiltVoicing,
  resolveVoicingRoot,
  type ElementalPlaybackResolution,
} from '../music/tiltVoicingPlayback';
import {
  resolveSmoothParallelSteps,
} from '../music/smoothestVoiceLeading';
import {
  tiltFromNoTiltLevels,
  resolveSmoothReanchorTilt,
  resolveSmoothestReanchorTilt,
  resolveSmoothPlaybackTiltForNavigation as resolveSmoothNavTilt,
} from '../music/playbackTiltResolution';
import { invalidateVoicingCache, invalidateVoicingCacheForCommit } from '../music/voicingCache';
import {
  lastPlayedBassReadout,
  lastPlayedVoicingReadout,
} from '../music/voiceDegreeLabel';
import { audioEngine } from '../audio/AudioEngine';
import { isPageInteractiveForAudio } from '../audio/pageInteraction';
import { unlockIosMediaChannel } from '../audio/iosMediaChannel';
import type { PlayStyle, VoiceLeadingMode } from '../context/types';
import { commitsSmoothestParallelBaseline, usesDeviceTilt } from '../context/types';
import { isElementalName, isOppositeElementNavigation, previousBassMidi, resolveElementalForNavigation, type ElementalName } from '../music/elementalRoot';
import {
  getLockedNoTiltBass,
  getLockedNoTiltVoicing,
  isNoTiltBassLocked,
  isNoTiltVoicingLocked,
  type NoTiltChordLockMaps,
} from '../music/noTiltChordLocks';

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
   * When true, ChordContext skips the no-tilt re-voice effect once so a
   * deferred level flush after pointer audio does not double-voice.
   */
  suppressNoTiltRevoiceRef: RefObject<boolean>;
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

function pitchesEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

import { clamp } from '../utils/clamp';

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

  const buildAnchorKey = useCallback(
    (displayChord: Chord, tilt: TiltSample): string => {
      const tonalCenter = tonalCenterRef.current;
      const octaveRange = chordManager.getOctaveRange();
      if (usesDeviceTilt(tiltModeRef.current)) {
        const { inputSteps, parallelSteps } = mapTiltToPositions(tilt);
        return [
          displayChord.name,
          tonalCenter,
          octaveRange,
          'tilt',
          inputSteps,
          parallelSteps,
        ].join('|');
      }
      const { voicingLevel, positionLevel } = noTiltLevelsFromTilt(tilt);
      return [
        displayChord.name,
        tonalCenter,
        octaveRange,
        'no_tilt',
        voicingLevel,
        positionLevel,
      ].join('|');
    },
    [tonalCenterRef]
  );

  const computeNeutralVoicing = useCallback(
    (
      displayChord: Chord,
      tilt: TiltSample,
      elemental?: ElementalPlaybackResolution
    ): number[] => {
      const anchor = usesDeviceTilt(tiltModeRef.current) ? 'contrary' : 'pivot';
      return computeNeutralTiltVoicing(
        displayChord,
        tilt,
        tonalCenterRef.current,
        chordManager.getOctaveRange(),
        {
          anchor,
          previousChord: previousChordRef.current,
          elemental,
        }
      );
    },
    [tonalCenterRef]
  );

  const resolvePlaybackTilt = useCallback(
    (fromPointer: boolean): TiltSample => {
      if (!usesDeviceTilt(tiltModeRef.current)) {
        return tiltFromNoTiltLevels(
          noTiltVoicingLevelRef.current,
          noTiltPositionLevelRef.current
        );
      }
      if (fromPointer) {
        playbackTiltRef.current = { ...rawTiltRef.current };
      }
      return playbackTiltRef.current;
    },
    [rawTiltRef, noTiltVoicingLevelRef, noTiltPositionLevelRef]
  );

  const getBaselineTilt = useCallback((): TiltSample => {
    if (usesDeviceTilt(tiltModeRef.current)) {
      return lastTapTiltRef.current;
    }
    return tiltFromNoTiltLevels(
      lastNoTiltVoicingLevelRef.current,
      lastNoTiltPositionLevelRef.current
    );
  }, []);

  const getCurrentControlTilt = useCallback((): TiltSample => {
    if (usesDeviceTilt(tiltModeRef.current)) {
      return { ...rawTiltRef.current };
    }
    return tiltFromNoTiltLevels(
      noTiltVoicingLevelRef.current,
      noTiltPositionLevelRef.current
    );
  }, [rawTiltRef, noTiltVoicingLevelRef, noTiltPositionLevelRef]);

  const syncNoTiltPositionLevel = useCallback(
    (effectiveParallel: number, deferSetState = false) => {
      const newLevel = noTiltPositionLevelFromParallelSteps(effectiveParallel);
      noTiltPositionLevelRef.current = newLevel;
      if (deferSetState) {
        queueMicrotask(() => {
          // Pair suppress with the deferred setState so the re-voice effect
          // skips one redundant pass after pointer audio already voiced.
          suppressNoTiltRevoiceRef.current = true;
          setNoTiltPositionLevel(newLevel);
        });
      } else {
        setNoTiltPositionLevel(newLevel);
      }
    },
    [setNoTiltPositionLevel, noTiltPositionLevelRef, suppressNoTiltRevoiceRef]
  );

  /**
   * Smoothest mode: minimum-motion parallel on chord change.
   */
  /**
   * Smoothest re-anchor. Writes refs only; React level/baseline flush happens
   * after audio in commitPlayback. Optional syncPositionLevel defers setState
   * on pointer taps (same contract as smooth mode).
   */
  const applySmoothestVoiceLeading = useCallback(
    (
      displayChord: Chord,
      elemental?: ElementalPlaybackResolution,
      syncPositionLevel: (effectiveParallel: number) => void = syncNoTiltPositionLevel
    ): TiltSample => {
      const lockMaps = noTiltLockMapsRef.current;
      const chordName = displayChord.name;

      if (!usesDeviceTilt(tiltModeRef.current)) {
        const voicingLocked = isNoTiltVoicingLocked(lockMaps, chordName);
        const bassLocked = isNoTiltBassLocked(lockMaps, chordName);

        if (voicingLocked && bassLocked) {
          const effectiveTilt = tiltFromNoTiltLevels(
            getLockedNoTiltVoicing(lockMaps, chordName)!,
            getLockedNoTiltBass(lockMaps, chordName)!
          );
          const effectiveParallel = parallelLevelFromTilt(effectiveTilt);
          smoothBaseParallelRef.current = effectiveParallel;
          return effectiveTilt;
        }
      }

      const baselineTilt = getBaselineTilt();
      const currentTilt = getCurrentControlTilt();
      const anchor = usesDeviceTilt(tiltModeRef.current) ? 'contrary' : 'pivot';
      const { rootPitchClass, homeMidi, pitchStructure } = resolveVoicingRoot(
        displayChord,
        tonalCenterRef.current,
        chordManager.getOctaveRange(),
        elemental
      );

      const searchBaseline =
        !usesDeviceTilt(tiltModeRef.current) &&
        isNoTiltVoicingLocked(lockMaps, chordName)
          ? tiltFromNoTiltLevels(
              getLockedNoTiltVoicing(lockMaps, chordName)!,
              noTiltPositionLevelRef.current
            )
          : baselineTilt;

      let effectiveParallel = resolveSmoothParallelSteps(
        neutralVoicingRef.current,
        pitchStructure,
        rootPitchClass,
        searchBaseline,
        tonalCenterRef.current,
        chordManager.getOctaveRange(),
        anchor,
        homeMidi
      );
      const parallelDelta =
        parallelLevelFromTilt(currentTilt) -
        parallelLevelFromTilt(baselineTilt);
      effectiveParallel = clamp(
        effectiveParallel + parallelDelta,
        -MAX_TILT_PITCH_STEPS,
        MAX_TILT_PITCH_STEPS
      );

      if (
        !usesDeviceTilt(tiltModeRef.current) &&
        isNoTiltBassLocked(lockMaps, chordName)
      ) {
        effectiveParallel = parallelStepsFromNoTiltPositionLevel(
          getLockedNoTiltBass(lockMaps, chordName)!
        );
      }

      const { inputSteps: currentWidth } = mapTiltToPositions(currentTilt);
      const inputSteps =
        !usesDeviceTilt(tiltModeRef.current) &&
        isNoTiltVoicingLocked(lockMaps, chordName)
          ? getLockedNoTiltVoicing(lockMaps, chordName)!
          : currentWidth;
      const effectiveTilt = tiltSampleFromLevels(
        inputSteps,
        effectiveParallel
      );

      smoothBaseParallelRef.current = effectiveParallel;

      if (
        !usesDeviceTilt(tiltModeRef.current) &&
        !isNoTiltBassLocked(lockMaps, chordName)
      ) {
        syncPositionLevel(effectiveParallel);
      }

      return effectiveTilt;
    },
    [
      getBaselineTilt,
      getCurrentControlTilt,
      syncNoTiltPositionLevel,
      tonalCenterRef,
      noTiltLockMapsRef,
      noTiltPositionLevelRef,
    ]
  );

  const preserveSameChordSmoothestTilt = useCallback(
    (
      chordName: string,
      syncPositionLevel: (effectiveParallel: number) => void = syncNoTiltPositionLevel
    ): TiltSample => {
      const currentTilt = getCurrentControlTilt();
      const parallelDelta =
        parallelLevelFromTilt(currentTilt) -
        parallelLevelFromTilt(lastTapTiltRef.current);
      const lockMaps = noTiltLockMapsRef.current;
      let effectiveParallel = clamp(
        smoothBaseParallelRef.current + parallelDelta,
        -MAX_TILT_PITCH_STEPS,
        MAX_TILT_PITCH_STEPS
      );

      if (!usesDeviceTilt(tiltModeRef.current) && isNoTiltBassLocked(lockMaps, chordName)) {
        effectiveParallel = parallelStepsFromNoTiltPositionLevel(
          getLockedNoTiltBass(lockMaps, chordName)!
        );
      }

      const { inputSteps } = mapTiltToPositions(currentTilt);
      const voicingInputSteps =
        !usesDeviceTilt(tiltModeRef.current) &&
        isNoTiltVoicingLocked(lockMaps, chordName)
          ? getLockedNoTiltVoicing(lockMaps, chordName)!
          : inputSteps;
      const effectiveTilt = tiltSampleFromLevels(
        voicingInputSteps,
        effectiveParallel
      );

      if (
        !usesDeviceTilt(tiltModeRef.current) &&
        !isNoTiltBassLocked(lockMaps, chordName)
      ) {
        syncPositionLevel(effectiveParallel);
      }

      return effectiveTilt;
    },
    [getCurrentControlTilt, syncNoTiltPositionLevel, noTiltLockMapsRef]
  );

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

  const resolveSmoothPlaybackTiltForNavigation = useCallback(
    (
      chord: Chord,
      liveTilt: TiltSample,
      isChordChange: boolean
    ): TiltSample => {
      return resolveSmoothNavTilt(
        chord,
        liveTilt,
        isChordChange,
        previousChordRef.current,
        lastTapTiltRef.current,
        lastCommittedPlaybackTiltRef.current
      );
    },
    []
  );

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

  const dispatchAudio = useCallback(
    (
      pitches: number[],
      options: {
        retrigger?: boolean;
        skipIfUnchanged?: boolean;
        fromPointer?: boolean;
      } = {}
    ) => {
      if (pitches.length === 0) return;

      const style = playStyleRef.current;
      const tiltMode = tiltModeRef.current;
      const {
        retrigger = false,
        skipIfUnchanged = false,
        fromPointer = false,
      } = options;

      if (
        !fromPointer &&
        (!isPageInteractiveForAudio() || audioEngine.isPageBackgrounded())
      ) {
        return;
      }

      if (
        skipIfUnchanged &&
        !retrigger &&
        pitchesEqual(pitches, activePitchesRef.current)
      ) {
        return;
      }

      if (style === 'click_and_hold') {
        if (fromPointer) {
          audioEngine.triggerAttack(pitches);
        } else {
          audioEngine.playNotes(pitches, '2n');
        }
        return;
      }

      if (tiltMode) {
        audioEngine.triggerAttack(pitches, retrigger);
        return;
      }

      audioEngine.triggerAttack(pitches, retrigger);
    },
    []
  );

  const updateVoiceLeadingBaseline = useCallback(
    (playbackTilt: TiltSample, deferSetState = false) => {
      lastCommittedPlaybackTiltRef.current = { ...playbackTilt };

      if (usesDeviceTilt(tiltModeRef.current)) {
        lastTapTiltRef.current = { ...rawTiltRef.current };
      } else {
        const { voicingLevel, positionLevel } =
          noTiltLevelsFromTilt(playbackTilt);
        lastNoTiltVoicingLevelRef.current = voicingLevel;
        lastNoTiltPositionLevelRef.current = positionLevel;
        lastTapTiltRef.current = playbackTilt;
      }

      if (commitsSmoothestParallelBaseline(voiceLeadingModeRef.current)) {
        const committedParallel = parallelLevelFromTilt(playbackTilt);
        smoothBaseParallelRef.current = committedParallel;
      }

      const applyReactSync = () => {
        setLastCommittedPlaybackTilt(lastCommittedPlaybackTiltRef.current);
        if (usesDeviceTilt(tiltModeRef.current)) {
          setLastTapTilt(lastTapTiltRef.current);
        } else {
          setLastTapTilt(lastTapTiltRef.current);
        }
        if (commitsSmoothestParallelBaseline(voiceLeadingModeRef.current)) {
          setSmoothBaseParallel(smoothBaseParallelRef.current);
        }
      };

      if (deferSetState) {
        queueMicrotask(() => startTransition(applyReactSync));
      } else {
        startTransition(applyReactSync);
      }
    },
    [rawTiltRef, voiceLeadingModeRef]
  );

  const commitPlayback = useCallback(
    (
      displayChord: Chord,
      pitches: number[],
      playbackTilt: TiltSample,
      state: BorrowingState,
      elemental: ElementalPlaybackResolution | undefined,
      options: {
        retrigger?: boolean;
        skipIfUnchanged?: boolean;
        fromPointer?: boolean;
        borrowingStateOverride?: BorrowingState;
      } = {}
    ) => {
      dispatchAudio(pitches, options);

      previousChordRef.current = displayChord;
      activePitchesRef.current = pitches;
      // Sole writer for selectedChordNameRef (no selectedChord mirror effect).
      // Sync before any deferred no-tilt level setState flushes. Otherwise the
      // ChordContext re-voice effect can replay the previous chord.
      selectedChordNameRef.current = displayChord.name;

      const fromPointer = options.fromPointer ?? false;
      if (fromPointer) {
        // Skip the re-voice effect once. Pointer commits change selectedChord,
        // which often recreates getBorrowingStateForChord and would re-enter
        // playAndDisplayChord without this guard (including first-chord paths
        // that do not queue a deferred level setState).
        suppressNoTiltRevoiceRef.current = true;
      }

      invalidateVoicingCacheForCommit(
        displayChord.name,
        state,
        voiceLeadingModeRef.current
      );
      updateVoiceLeadingBaseline(playbackTilt, fromPointer);

      // Chord identity and readout must stay sync after audio. Deferring them
      // via startTransition races with normal-priority level updates and can
      // leave the UI (and re-voice effect) stuck on the previous chord.
      setPreviousPlayedChord(displayChord);
      setSelectedChord(displayChord);
      if (elemental) {
        setLastElementalPlayback(elemental);
      } else if (!isElementalName(displayChord.name)) {
        setLastElementalPlayback(null);
      }
      setActivePitches(pitches);
      if (options.borrowingStateOverride) {
        borrowingStateRef.current = options.borrowingStateOverride;
        setBorrowingState(options.borrowingStateOverride);
      }

      const deferLabels = fromPointer;
      const applyTiltLabels = () => {
        if (usesDeviceTilt(tiltModeRef.current)) {
          setLastPlayedVoicingLabel(lastPlayedVoicingReadout(playbackTilt));
          setLastPlayedBassLabel(
            lastPlayedBassReadout(playbackTilt, displayChord, {
              voicedPitches: pitches,
              borrowingState: state,
            })
          );
        }
      };

      if (deferLabels) {
        queueMicrotask(() => startTransition(applyTiltLabels));
      } else {
        startTransition(applyTiltLabels);
      }
    },
    [
      borrowingStateRef,
      dispatchAudio,
      selectedChordNameRef,
      suppressNoTiltRevoiceRef,
      setBorrowingState,
      setSelectedChord,
      updateVoiceLeadingBaseline,
      voiceLeadingModeRef,
    ]
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
          suppressNoTiltRevoiceRef.current = true;
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
