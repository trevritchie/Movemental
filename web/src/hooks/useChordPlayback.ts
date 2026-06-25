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
import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
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
  resolveSmoothNoTiltPlaybackTilt,
  resolveSmoothPlaybackTilt,
} from '../music/predeterminedVoiceLeading';
import { invalidateVoicingCache } from '../music/voicingCache';
import {
  lastPlayedBassReadout,
  lastPlayedVoicingReadout,
} from '../music/voiceDegreeLabel';
import { audioEngine } from '../audio/AudioEngine';
import { unlockIosMediaChannel } from '../audio/iosMediaChannel';
import type { PlayStyle, VoiceLeadingMode } from '../context/types';
import { commitsSmoothestParallelBaseline, isNoTiltPlayStyle } from '../context/types';
import { isElementalName, resolveDeterministicElementalPlayback, resolveElementalPlayback } from '../music/elementalRoot';

interface UseChordPlaybackOptions {
  getBorrowingStateForChord: (
    chordName: string,
    currentGlobalState: BorrowingState
  ) => BorrowingState;
  borrowingStateRef: RefObject<BorrowingState>;
  setBorrowingState: (state: BorrowingState) => void;
  setSelectedChord: (chord: Chord | null) => void;
  rawTiltRef: RefObject<TiltSample>;
  noTiltVoicingLevelRef: RefObject<number>;
  noTiltPositionLevelRef: RefObject<number>;
  tonalCenterRef: RefObject<number>;
  voiceLeadingModeRef: RefObject<VoiceLeadingMode>;
  setNoTiltPositionLevel: (level: number) => void;
}

function pitchesEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

interface PlaybackResolution {
  displayChord: Chord;
  elemental?: ElementalPlaybackResolution;
}

function tiltFromNoTiltLevels(
  voicingLevel: number,
  positionLevel: number
): TiltSample {
  return tiltSampleFromLevels(
    voicingLevel,
    parallelStepsFromNoTiltPositionLevel(positionLevel)
  );
}

export function useChordPlayback({
  getBorrowingStateForChord,
  borrowingStateRef,
  setBorrowingState,
  setSelectedChord,
  rawTiltRef,
  noTiltVoicingLevelRef,
  noTiltPositionLevelRef,
  tonalCenterRef,
  voiceLeadingModeRef,
  setNoTiltPositionLevel,
}: UseChordPlaybackOptions) {
  const [playStyle, setPlayStyle] = useState<PlayStyle>('drone');
  const [activePitches, setActivePitches] = useState<(number | null)[]>([]);
  const [previousPlayedChord, setPreviousPlayedChord] = useState<Chord | null>(
    null
  );
  const [lastTapTilt, setLastTapTilt] = useState<TiltSample>(FLAT_TILT);
  const [smoothBaseParallel, setSmoothBaseParallel] = useState(0);
  const [lastPlayedVoicingLabel, setLastPlayedVoicingLabel] = useState<
    string | null
  >(null);
  const [lastPlayedBassLabel, setLastPlayedBassLabel] = useState<
    string | null
  >(null);

  const isPointerDownRef = useRef(false);
  const playStyleRef = useRef(playStyle);
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
  /** Winning parallel steps from smooth search (before pitch delta). */
  const smoothBaseParallelRef = useRef(0);
  /** No-tilt control levels at the previous chord commit. */
  const lastNoTiltVoicingLevelRef = useRef(DEFAULT_NO_TILT_VOICING_LEVEL);
  const lastNoTiltPositionLevelRef = useRef(DEFAULT_NO_TILT_POSITION_LEVEL);

  const buildAnchorKey = useCallback(
    (displayChord: Chord, style: PlayStyle, tilt: TiltSample): string => {
      const tonalCenter = tonalCenterRef.current;
      const octaveRange = chordManager.getOctaveRange();
      if (style === 'tilt') {
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
      style: PlayStyle,
      tilt: TiltSample,
      elemental?: ElementalPlaybackResolution
    ): number[] => {
      const anchor = isNoTiltPlayStyle(style) ? 'pivot' : 'contrary';
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
    (style: PlayStyle, fromPointer: boolean): TiltSample => {
      if (isNoTiltPlayStyle(style)) {
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

  const getBaselineTilt = useCallback((style: PlayStyle): TiltSample => {
    if (style === 'tilt') {
      return lastTapTiltRef.current;
    }
    return tiltFromNoTiltLevels(
      lastNoTiltVoicingLevelRef.current,
      lastNoTiltPositionLevelRef.current
    );
  }, []);

  const getCurrentControlTilt = useCallback(
    (style: PlayStyle): TiltSample => {
      if (style === 'tilt') {
        return { ...rawTiltRef.current };
      }
      return tiltFromNoTiltLevels(
        noTiltVoicingLevelRef.current,
        noTiltPositionLevelRef.current
      );
    },
    [rawTiltRef, noTiltVoicingLevelRef, noTiltPositionLevelRef]
  );

  const syncNoTiltPositionLevel = useCallback(
    (effectiveParallel: number) => {
      const newLevel = noTiltPositionLevelFromParallelSteps(effectiveParallel);
      noTiltPositionLevelRef.current = newLevel;
      setNoTiltPositionLevel(newLevel);
    },
    [setNoTiltPositionLevel, noTiltPositionLevelRef]
  );

  /**
   * Smoothest mode: minimum-motion parallel on chord change.
   */
  const applySmoothestVoiceLeading = useCallback(
    (
      displayChord: Chord,
      style: PlayStyle,
      elemental?: ElementalPlaybackResolution
    ): TiltSample => {
      const baselineTilt = getBaselineTilt(style);
      const currentTilt = getCurrentControlTilt(style);
      const anchor = isNoTiltPlayStyle(style) ? 'pivot' : 'contrary';
      const { rootPitchClass, homeMidi, pitchStructure } = resolveVoicingRoot(
        displayChord,
        tonalCenterRef.current,
        chordManager.getOctaveRange(),
        previousChordRef.current,
        elemental
      );
      let effectiveParallel = resolveSmoothParallelSteps(
        neutralVoicingRef.current,
        pitchStructure,
        rootPitchClass,
        baselineTilt,
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

      const { inputSteps: currentWidth } = mapTiltToPositions(currentTilt);
      const effectiveTilt = tiltSampleFromLevels(
        currentWidth,
        effectiveParallel
      );

      smoothBaseParallelRef.current = effectiveParallel;
      setSmoothBaseParallel(effectiveParallel);

      if (isNoTiltPlayStyle(style)) {
        syncNoTiltPositionLevel(effectiveParallel);
      }

      return effectiveTilt;
    },
    [
      getBaselineTilt,
      getCurrentControlTilt,
      syncNoTiltPositionLevel,
      tonalCenterRef,
    ]
  );

  /**
   * Smoothest mode: re-tap same chord; pitch delta since last commit on smoothBase.
   */
  const preserveSameChordSmoothestTilt = useCallback(
    (style: PlayStyle): TiltSample => {
      const currentTilt = getCurrentControlTilt(style);
      const parallelDelta =
        parallelLevelFromTilt(currentTilt) -
        parallelLevelFromTilt(lastTapTiltRef.current);
      const effectiveParallel = clamp(
        smoothBaseParallelRef.current + parallelDelta,
        -MAX_TILT_PITCH_STEPS,
        MAX_TILT_PITCH_STEPS
      );
      const { inputSteps } = mapTiltToPositions(currentTilt);
      const effectiveTilt = tiltSampleFromLevels(
        inputSteps,
        effectiveParallel
      );

      if (isNoTiltPlayStyle(style)) {
        syncNoTiltPositionLevel(effectiveParallel);
      }

      return effectiveTilt;
    },
    [getCurrentControlTilt, syncNoTiltPositionLevel]
  );

  const resetVoiceLeadingSession = useCallback(() => {
    lastTapTiltRef.current = FLAT_TILT;
    setLastTapTilt(FLAT_TILT);
    smoothBaseParallelRef.current = 0;
    setSmoothBaseParallel(0);
    setLastPlayedVoicingLabel(null);
    setLastPlayedBassLabel(null);
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

  const resolveForPlayback = useCallback(
    (chord: Chord): PlaybackResolution => {
      if (!isElementalName(chord.name)) {
        return { displayChord: chord };
      }
      const tonalCenter = tonalCenterRef.current;
      const octaveRange = chordManager.getOctaveRange();
      const resolved =
        voiceLeadingModeRef.current === 'smooth'
          ? resolveDeterministicElementalPlayback(
              chord,
              tonalCenter,
              octaveRange
            )
          : resolveElementalPlayback(
              chord,
              tonalCenter,
              octaveRange,
              previousChordRef.current
            );
      return {
        displayChord: resolved.chord,
        elemental: {
          rootPitchClass: resolved.rootPitchClass,
          homeMidi: resolved.homeMidi,
        },
      };
    },
    [tonalCenterRef, voiceLeadingModeRef]
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
      style: PlayStyle,
      options: {
        retrigger?: boolean;
        skipIfUnchanged?: boolean;
        fromPointer?: boolean;
      } = {}
    ) => {
      if (pitches.length === 0) return;

      const {
        retrigger = false,
        skipIfUnchanged = false,
        fromPointer = false,
      } = options;
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

      if (style === 'tilt') {
        audioEngine.triggerAttack(pitches, retrigger);
        return;
      }

      audioEngine.triggerAttack(pitches);
    },
    []
  );

  const updateVoiceLeadingBaseline = useCallback(
    (style: PlayStyle, playbackTilt: TiltSample) => {
      if (style === 'tilt') {
        lastTapTiltRef.current = { ...rawTiltRef.current };
        setLastTapTilt(lastTapTiltRef.current);
      } else {
        const { voicingLevel, positionLevel } =
          noTiltLevelsFromTilt(playbackTilt);
        lastNoTiltVoicingLevelRef.current = voicingLevel;
        lastNoTiltPositionLevelRef.current = positionLevel;
        lastTapTiltRef.current = playbackTilt;
        setLastTapTilt(playbackTilt);
      }

      if (commitsSmoothestParallelBaseline(voiceLeadingModeRef.current)) {
        const committedParallel = parallelLevelFromTilt(playbackTilt);
        smoothBaseParallelRef.current = committedParallel;
        setSmoothBaseParallel(committedParallel);
      }
    },
    [rawTiltRef, voiceLeadingModeRef]
  );

  const commitPlayback = useCallback(
    (
      displayChord: Chord,
      pitches: number[],
      playbackTilt: TiltSample,
      options: {
        retrigger?: boolean;
        skipIfUnchanged?: boolean;
        fromPointer?: boolean;
      } = {}
    ) => {
      previousChordRef.current = displayChord;
      setPreviousPlayedChord(displayChord);
      setSelectedChord(displayChord);
      activePitchesRef.current = pitches;
      setActivePitches(pitches);
      invalidateVoicingCache();
      updateVoiceLeadingBaseline(playStyleRef.current, playbackTilt);
      if (playStyleRef.current === 'tilt') {
        setLastPlayedVoicingLabel(lastPlayedVoicingReadout(playbackTilt));
        setLastPlayedBassLabel(
          lastPlayedBassReadout(playbackTilt, displayChord)
        );
      }
      dispatchAudio(pitches, playStyleRef.current, options);
    },
    [dispatchAudio, setSelectedChord, updateVoiceLeadingBaseline]
  );

  const voiceAndPlay = useCallback(
    (
      chord: Chord,
      state: BorrowingState,
      options: {
        retrigger?: boolean;
        skipIfUnchanged?: boolean;
        fromPointer?: boolean;
      } = {}
    ) => {
      const { displayChord, elemental } = resolveForPlayback(chord);
      const style = playStyleRef.current;
      const fromPointer = options.fromPointer ?? false;
      let playbackTilt = resolvePlaybackTilt(style, fromPointer);
      const anchorKey = buildAnchorKey(displayChord, style, playbackTilt);
      const needsReanchor =
        fromPointer || anchorKeyRef.current !== anchorKey;
      const isChordChange =
        previousChordRef.current !== null &&
        previousChordRef.current.name !== displayChord.name;
      const isFirstChord = previousChordRef.current === null;

      // Voice leading parallel adjustment (re-anchor only):
      // - root_position: baseline 0 at flat pitch (implicit in resolvePlaybackTilt)
      // - smooth: per-chord CHORD_FLAT_PARALLEL lookup + live tilt offset
      // - smoothest: live minimum-motion search vs previous voicing (+ session state)
      if (needsReanchor && voiceLeadingModeRef.current === 'smooth') {
        if (style === 'tilt') {
          playbackTilt = resolveSmoothPlaybackTilt(
            displayChord.name,
            getCurrentControlTilt(style)
          );
          playbackTiltRef.current = playbackTilt;
        } else if (isChordChange || isFirstChord) {
          playbackTilt = resolveSmoothNoTiltPlaybackTilt(
            displayChord.name,
            noTiltVoicingLevelRef.current
          );
          syncNoTiltPositionLevel(parallelLevelFromTilt(playbackTilt));
        } else {
          playbackTilt = tiltFromNoTiltLevels(
            noTiltVoicingLevelRef.current,
            noTiltPositionLevelRef.current
          );
        }
      } else if (
        needsReanchor &&
        voiceLeadingModeRef.current === 'smoothest' &&
        isChordChange &&
        neutralVoicingRef.current.length > 0
      ) {
        playbackTilt = applySmoothestVoiceLeading(
          displayChord,
          style,
          elemental
        );
        if (style === 'tilt') {
          playbackTiltRef.current = playbackTilt;
        }
      } else if (
        needsReanchor &&
        voiceLeadingModeRef.current === 'smoothest' &&
        !isChordChange &&
        neutralVoicingRef.current.length > 0
      ) {
        playbackTilt = preserveSameChordSmoothestTilt(style);
        if (style === 'tilt') {
          playbackTiltRef.current = playbackTilt;
        }
      } else if (
        needsReanchor &&
        voiceLeadingModeRef.current === 'smoothest' &&
        neutralVoicingRef.current.length === 0
      ) {
        const baselineTilt = getBaselineTilt(style);
        const currentTilt = getCurrentControlTilt(style);
        const parallelDelta =
          parallelLevelFromTilt(currentTilt) -
          parallelLevelFromTilt(baselineTilt);
        const baseParallel = parallelLevelFromTilt(playbackTilt);
        const effectiveParallel = clamp(
          baseParallel + parallelDelta,
          -MAX_TILT_PITCH_STEPS,
          MAX_TILT_PITCH_STEPS
        );
        const { inputSteps } = mapTiltToPositions(currentTilt);
        playbackTilt = tiltSampleFromLevels(inputSteps, effectiveParallel);
        if (style === 'tilt') {
          playbackTiltRef.current = playbackTilt;
        }
        smoothBaseParallelRef.current = effectiveParallel;
        setSmoothBaseParallel(effectiveParallel);
      }

      if (needsReanchor) {
        neutralVoicingRef.current = computeNeutralVoicing(
          displayChord,
          style,
          playbackTilt,
          elemental
        );
        anchorKeyRef.current = buildAnchorKey(
          displayChord,
          style,
          playbackTilt
        );
      }

      const pitches = computeVoicedPitchesFromAnchor(displayChord, state);

      if (pitches.length === 0) {
        previousChordRef.current = displayChord;
        setPreviousPlayedChord(displayChord);
        setSelectedChord(displayChord);
        activePitchesRef.current = [];
        setActivePitches([]);
        invalidateVoicingCache();
        updateVoiceLeadingBaseline(style, playbackTilt);
        audioEngine.releaseActiveNotes();
        return;
      }

      commitPlayback(displayChord, pitches, playbackTilt, options);
    },
    [
      resolveForPlayback,
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
      setSelectedChord,
      updateVoiceLeadingBaseline,
      voiceLeadingModeRef,
    ]
  );

  const playAndDisplayChord = useCallback(
    (chord: Chord, state: BorrowingState) => {
      voiceAndPlay(chord, state, {
        retrigger: false,
        skipIfUnchanged: false,
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

  const applyChordWithBorrowing = useCallback(
    (chord: Chord) => {
      const newState = getBorrowingStateForChord(
        chord.name,
        borrowingStateRef.current
      );
      setBorrowingState(newState);
      voiceAndPlay(chord, newState, {
        retrigger: playStyleRef.current === 'tilt',
        fromPointer: true,
      });
      return newState;
    },
    [
      getBorrowingStateForChord,
      borrowingStateRef,
      setBorrowingState,
      voiceAndPlay,
    ]
  );

  const handleChordPointerDown = (chord: Chord) => {
    unlockIosMediaChannel();
    isPointerDownRef.current = true;
    applyChordWithBorrowing(chord);
  };

  const handleChordPointerUp = () => {
    isPointerDownRef.current = false;
    if (playStyleRef.current === 'click_and_hold') {
      audioEngine.releaseActiveNotes();
    }
  };

  const handleChordPointerEnter = (chord: Chord) => {
    if (isPointerDownRef.current) {
      applyChordWithBorrowing(chord);
    }
  };

  return {
    playStyle,
    setPlayStyle: changePlayStyle,
    activePitches,
    previousPlayedChord,
    lastTapTilt,
    smoothBaseParallel,
    lastPlayedVoicingLabel,
    lastPlayedBassLabel,
    playAndDisplayChord,
    handleChordPointerDown,
    handleChordPointerUp,
    handleChordPointerEnter,
  };
}
