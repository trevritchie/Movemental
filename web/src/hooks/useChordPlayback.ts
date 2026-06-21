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
  mapTiltToPositions,
  parallelStepsFromStaticPositionLevel,
  tiltSampleFromLevels,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import {
  applyVoicingOverlays,
  computeNeutralTiltVoicing,
  type ElementalPlaybackResolution,
} from '../music/tiltVoicingPlayback';
import { invalidateVoicingCache } from '../music/voicingCache';
import { triggerHaptic } from '../audio/haptics';
import { audioEngine } from '../audio/AudioEngine';
import { unlockIosMediaChannel } from '../audio/iosMediaChannel';
import type { PlayStyle } from '../context/types';
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
}

function pitchesEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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
  rawTiltRef,
  staticVoicingLevelRef,
  staticPositionLevelRef,
  tonalCenterRef,
}: UseChordPlaybackOptions) {
  const [playStyle, setPlayStyle] = useState<PlayStyle>('drone');
  const [activePitches, setActivePitches] = useState<(number | null)[]>([]);
  const [previousPlayedChord, setPreviousPlayedChord] = useState<Chord | null>(
    null
  );

  const isPointerDownRef = useRef(false);
  const playStyleRef = useRef(playStyle);
  /** Last *resolved* chord (elemental root applied). Drives contrary-motion chains. */
  const previousChordRef = useRef<Chord | null>(null);
  /** Mirror of activePitches for skipIfUnchanged without re-rendering. */
  const activePitchesRef = useRef<number[]>([]);
  /** Tilt sample locked at last diagram pointer trigger (tilt mode). */
  const playbackTiltRef = useRef<TiltSample>({ x: 0, y: 0 });
  /** Neutral voiced MIDI spread for overlay borrow/mute edits. */
  const neutralVoicingRef = useRef<number[]>([]);
  /** Detect stale anchors when chord or register settings change. */
  const anchorKeyRef = useRef<string>('');

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
        return tiltSampleFromLevels(
          staticVoicingLevelRef.current,
          parallelStepsFromStaticPositionLevel(
            staticPositionLevelRef.current
          )
        );
      }
      if (fromPointer) {
        playbackTiltRef.current = { ...rawTiltRef.current };
      }
      return playbackTiltRef.current;
    },
    [rawTiltRef, staticVoicingLevelRef, staticPositionLevelRef]
  );

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
    setPlayStyle(style);
  }, []);

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

  /**
   * Route voiced MIDI to the correct AudioEngine mode.
   *
   * click_and_hold splits by source: diagram pointer sustains until pointer-up;
   * borrowing/settings sliders use timed playNotes previews.
   */
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
        triggerHaptic();
        audioEngine.triggerAttack(pitches, retrigger);
        return;
      }

      audioEngine.triggerAttack(pitches);
    },
    []
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
      dispatchAudio(pitches, playStyleRef.current, options);
    },
    [dispatchAudio, setSelectedChord]
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
      const playbackTilt = resolvePlaybackTilt(style, fromPointer);
      const anchorKey = buildAnchorKey(displayChord, style, playbackTilt);
      const needsReanchor =
        fromPointer || anchorKeyRef.current !== anchorKey;

      if (needsReanchor) {
        neutralVoicingRef.current = computeNeutralVoicing(
          displayChord,
          style,
          playbackTilt,
          elemental
        );
        anchorKeyRef.current = anchorKey;
      }

      const pitches = computeVoicedPitchesFromAnchor(displayChord, state);

      if (pitches.length === 0) {
        previousChordRef.current = displayChord;
        setPreviousPlayedChord(displayChord);
        setSelectedChord(displayChord);
        activePitchesRef.current = [];
        setActivePitches([]);
        invalidateVoicingCache();
        audioEngine.releaseActiveNotes();
        return;
      }

      commitPlayback(displayChord, pitches, options);
    },
    [
      resolveForPlayback,
      resolvePlaybackTilt,
      buildAnchorKey,
      computeNeutralVoicing,
      computeVoicedPitchesFromAnchor,
      commitPlayback,
      setSelectedChord,
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
    playAndDisplayChord,
    handleChordPointerDown,
    handleChordPointerUp,
    handleChordPointerEnter,
  };
}
