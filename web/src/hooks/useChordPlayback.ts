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
 * - drone/static controls: pivot roll (position sets the bass note)
 */
import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import { chordManager, type Chord } from '../music/ChordManager';
import { type BorrowingState } from '../music/BorrowingLogic';
import {
  DEFAULT_STATIC_POSITION_LEVEL,
  DEFAULT_STATIC_VOICING_LEVEL,
  FLAT_TILT,
  mapTiltToPositions,
  MAX_TILT_PITCH_STEPS,
  parallelLevelFromTilt,
  parallelStepsFromStaticPositionLevel,
  staticPositionLevelFromParallelSteps,
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
} from '../music/smoothVoiceLeading';
import { invalidateVoicingCache } from '../music/voicingCache';
import { audioEngine } from '../audio/AudioEngine';
import { unlockIosMediaChannel } from '../audio/iosMediaChannel';
import type { PlayStyle, VoiceLeadingMode } from '../context/types';
import { isElementalName, resolveElementalPlayback } from '../music/elementalRoot';

interface UseChordPlaybackOptions {
  getBorrowingStateForChord: (
    chordName: string,
    currentGlobalState: BorrowingState
  ) => BorrowingState;
  borrowingStateRef: RefObject<BorrowingState>;
  setBorrowingState: (state: BorrowingState) => void;
  setSelectedChord: (chord: Chord | null) => void;
  rawTiltRef: RefObject<TiltSample>;
  staticVoicingLevelRef: RefObject<number>;
  staticPositionLevelRef: RefObject<number>;
  tonalCenterRef: RefObject<number>;
  voiceLeadingModeRef: RefObject<VoiceLeadingMode>;
  setStaticPositionLevel: (level: number) => void;
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

function tiltFromStaticLevels(
  voicingLevel: number,
  positionLevel: number
): TiltSample {
  return tiltSampleFromLevels(
    voicingLevel,
    parallelStepsFromStaticPositionLevel(positionLevel)
  );
}

export function useChordPlayback({
  getBorrowingStateForChord,
  borrowingStateRef,
  setBorrowingState,
  setSelectedChord,
  rawTiltRef,
  staticVoicingLevelRef,
  staticPositionLevelRef,
  tonalCenterRef,
  voiceLeadingModeRef,
  setStaticPositionLevel,
}: UseChordPlaybackOptions) {
  const [playStyle, setPlayStyle] = useState<PlayStyle>('drone');
  const [activePitches, setActivePitches] = useState<(number | null)[]>([]);
  const [previousPlayedChord, setPreviousPlayedChord] = useState<Chord | null>(
    null
  );
  const [lastTapTilt, setLastTapTilt] = useState<TiltSample>(FLAT_TILT);
  const [smoothBaseParallel, setSmoothBaseParallel] = useState(0);

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
  /** Static control levels at the previous chord commit. */
  const lastStaticVoicingLevelRef = useRef(DEFAULT_STATIC_VOICING_LEVEL);
  const lastStaticPositionLevelRef = useRef(DEFAULT_STATIC_POSITION_LEVEL);

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
      return [
        displayChord.name,
        tonalCenter,
        octaveRange,
        'static',
        staticVoicingLevelRef.current,
        staticPositionLevelRef.current,
      ].join('|');
    },
    [tonalCenterRef, staticVoicingLevelRef, staticPositionLevelRef]
  );

  const computeNeutralVoicing = useCallback(
    (
      displayChord: Chord,
      style: PlayStyle,
      tilt: TiltSample,
      elemental?: ElementalPlaybackResolution
    ): number[] => {
      const anchor = style === 'tilt' ? 'contrary' : 'pivot';
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
      if (style !== 'tilt') {
        return tiltFromStaticLevels(
          staticVoicingLevelRef.current,
          staticPositionLevelRef.current
        );
      }
      if (fromPointer) {
        playbackTiltRef.current = { ...rawTiltRef.current };
      }
      return playbackTiltRef.current;
    },
    [rawTiltRef, staticVoicingLevelRef, staticPositionLevelRef]
  );

  const getBaselineTilt = useCallback((style: PlayStyle): TiltSample => {
    if (style === 'tilt') {
      return lastTapTiltRef.current;
    }
    return tiltFromStaticLevels(
      lastStaticVoicingLevelRef.current,
      lastStaticPositionLevelRef.current
    );
  }, []);

  const getCurrentControlTilt = useCallback(
    (style: PlayStyle): TiltSample => {
      if (style === 'tilt') {
        return { ...rawTiltRef.current };
      }
      return tiltFromStaticLevels(
        staticVoicingLevelRef.current,
        staticPositionLevelRef.current
      );
    },
    [rawTiltRef, staticVoicingLevelRef, staticPositionLevelRef]
  );

  const applySmoothVoiceLeading = useCallback(
    (
      displayChord: Chord,
      style: PlayStyle,
      elemental?: ElementalPlaybackResolution
    ): TiltSample => {
      const baselineTilt = getBaselineTilt(style);
      const currentTilt = getCurrentControlTilt(style);
      const anchor = style === 'tilt' ? 'contrary' : 'pivot';
      const { rootPitchClass, homeMidi, pitchStructure } = resolveVoicingRoot(
        displayChord,
        tonalCenterRef.current,
        chordManager.getOctaveRange(),
        previousChordRef.current,
        elemental
      );

      const smoothParallel = resolveSmoothParallelSteps(
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
      const effectiveParallel = clamp(
        smoothParallel + parallelDelta,
        -MAX_TILT_PITCH_STEPS,
        MAX_TILT_PITCH_STEPS
      );

      const { inputSteps: currentWidth } = mapTiltToPositions(currentTilt);
      const effectiveTilt = tiltSampleFromLevels(
        currentWidth,
        effectiveParallel
      );

      smoothBaseParallelRef.current = smoothParallel;
      setSmoothBaseParallel(smoothParallel);

      if (style !== 'tilt') {
        setStaticPositionLevel(
          staticPositionLevelFromParallelSteps(effectiveParallel)
        );
      }

      return effectiveTilt;
    },
    [
      getBaselineTilt,
      getCurrentControlTilt,
      setStaticPositionLevel,
      tonalCenterRef,
    ]
  );

  const resetVoiceLeadingSession = useCallback(() => {
    lastTapTiltRef.current = FLAT_TILT;
    setLastTapTilt(FLAT_TILT);
    smoothBaseParallelRef.current = 0;
    setSmoothBaseParallel(0);
    lastStaticVoicingLevelRef.current = DEFAULT_STATIC_VOICING_LEVEL;
    lastStaticPositionLevelRef.current = DEFAULT_STATIC_POSITION_LEVEL;
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
      const resolved = resolveElementalPlayback(
        chord,
        tonalCenterRef.current,
        chordManager.getOctaveRange(),
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
    (style: PlayStyle) => {
      if (style === 'tilt') {
        lastTapTiltRef.current = { ...rawTiltRef.current };
        setLastTapTilt(lastTapTiltRef.current);
      } else {
        lastStaticVoicingLevelRef.current = staticVoicingLevelRef.current;
        lastStaticPositionLevelRef.current = staticPositionLevelRef.current;
        lastTapTiltRef.current = tiltFromStaticLevels(
          lastStaticVoicingLevelRef.current,
          lastStaticPositionLevelRef.current
        );
        setLastTapTilt(lastTapTiltRef.current);
      }
    },
    [rawTiltRef, staticVoicingLevelRef, staticPositionLevelRef]
  );

  const commitPlayback = useCallback(
    (
      displayChord: Chord,
      pitches: number[],
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
      updateVoiceLeadingBaseline(playStyleRef.current);
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

      if (
        needsReanchor &&
        voiceLeadingModeRef.current === 'smooth' &&
        isChordChange &&
        neutralVoicingRef.current.length > 0
      ) {
        playbackTilt = applySmoothVoiceLeading(
          displayChord,
          style,
          elemental
        );
        if (style === 'tilt') {
          playbackTiltRef.current = playbackTilt;
        }
      } else if (
        needsReanchor &&
        voiceLeadingModeRef.current === 'smooth'
      ) {
        const baseParallel = parallelLevelFromTilt(playbackTilt);
        smoothBaseParallelRef.current = baseParallel;
        setSmoothBaseParallel(baseParallel);
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
        updateVoiceLeadingBaseline(style);
        audioEngine.releaseActiveNotes();
        return;
      }

      commitPlayback(displayChord, pitches, options);
    },
    [
      resolveForPlayback,
      resolvePlaybackTilt,
      buildAnchorKey,
      applySmoothVoiceLeading,
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
    playAndDisplayChord,
    handleChordPointerDown,
    handleChordPointerUp,
    handleChordPointerEnter,
  };
}
