import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import { chordManager, type Chord } from '../music/ChordManager';
import { borrowingLogic, type BorrowingState } from '../music/BorrowingLogic';
import {
  computeTiltVoicing,
  tiltSampleFromLevels,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import { triggerHaptic } from '../audio/haptics';
import { audioEngine } from '../audio/AudioEngine';
import { unlockIosMediaChannel } from '../audio/iosMediaChannel';
import type { PlayStyle } from '../context/types';
import {
  isElementalName,
  resolveElementalPlayback,
} from '../music/elementalRoot';

interface UseChordPlaybackOptions {
  getBorrowingStateForChord: (
    chordName: string,
    currentGlobalState: BorrowingState
  ) => BorrowingState;
  borrowingStateRef: RefObject<BorrowingState>;
  setBorrowingState: (state: BorrowingState) => void;
  setSelectedChord: (chord: Chord | null) => void;
  tiltRef: RefObject<TiltSample>;
  staticVoicingLevelRef: RefObject<number>;
  staticPositionLevelRef: RefObject<number>;
  tonalCenterRef: RefObject<number>;
}

export function useChordPlayback({
  getBorrowingStateForChord,
  borrowingStateRef,
  setBorrowingState,
  setSelectedChord,
  tiltRef,
  staticVoicingLevelRef,
  staticPositionLevelRef,
  tonalCenterRef,
}: UseChordPlaybackOptions) {
  const [playStyle, setPlayStyle] = useState<PlayStyle>('drone');
  const [activePitches, setActivePitches] = useState<(number | null)[]>([]);

  const isPointerDownRef = useRef(false);
  const playStyleRef = useRef(playStyle);
  const previousChordRef = useRef<Chord | null>(null);

  useEffect(() => {
    playStyleRef.current = playStyle;
    audioEngine.releaseActiveNotes();
    isPointerDownRef.current = false;
  }, [playStyle]);

  const computeVoicedPitches = useCallback(
    (chord: Chord, state: BorrowingState, tilt: TiltSample): number[] => {
      const structure = borrowingLogic.generatePitchStructureForVoicing(
        chord,
        state
      );
      const tonalCenter = tonalCenterRef.current;
      const octaveRange = chordManager.getOctaveRange();
      const mutedPitchClasses = borrowingLogic.getMutedPitchClasses(
        chord,
        state
      );

      let voiced: number[];
      if (isElementalName(chord.name)) {
        const resolved = resolveElementalPlayback(
          chord,
          tonalCenter,
          octaveRange,
          previousChordRef.current
        );
        voiced = computeTiltVoicing(
          structure,
          resolved.rootPitchClass,
          tilt,
          octaveRange,
          tonalCenter,
          resolved.homeMidi
        );
      } else {
        const rootPitchClass = chord.pitches[chord.rootPositionIndex] % 12;
        voiced = computeTiltVoicing(
          structure,
          rootPitchClass,
          tilt,
          octaveRange,
          tonalCenter
        );
      }

      return borrowingLogic.filterVoicingMutes(voiced, mutedPitchClasses);
    },
    [tonalCenterRef]
  );

  const computeTiltPitches = useCallback(
    (chord: Chord, state: BorrowingState): number[] =>
      computeVoicedPitches(chord, state, tiltRef.current),
    [computeVoicedPitches, tiltRef]
  );

  const computeStaticPitches = useCallback(
    (chord: Chord, state: BorrowingState): number[] =>
      computeVoicedPitches(
        chord,
        state,
        tiltSampleFromLevels(
          staticVoicingLevelRef.current,
          staticPositionLevelRef.current
        )
      ),
    [computeVoicedPitches, staticVoicingLevelRef, staticPositionLevelRef]
  );

  const playPitches = useCallback(
    (pitches: number[], style: PlayStyle) => {
      setActivePitches(pitches);
      if (pitches.length === 0) return;

      if (style === 'click_and_hold') {
        audioEngine.playNotes(pitches, '2n');
      } else {
        audioEngine.triggerAttack(pitches);
      }
    },
    []
  );

  const resolvePlaybackChord = useCallback(
    (chord: Chord): Chord => {
      if (!isElementalName(chord.name)) return chord;
      return resolveElementalPlayback(
        chord,
        tonalCenterRef.current,
        chordManager.getOctaveRange(),
        previousChordRef.current
      ).chord;
    },
    [tonalCenterRef]
  );

  const playAndDisplayChord = useCallback(
    (chord: Chord, state: BorrowingState) => {
      const playbackChord = resolvePlaybackChord(chord);
      if (playStyle === 'tilt') {
        const pitches = computeTiltPitches(playbackChord, state);
        playPitches(pitches, playStyle);
        return;
      }

      const pitches = computeStaticPitches(playbackChord, state);
      playPitches(pitches, playStyle);
    },
    [
      playStyle,
      resolvePlaybackChord,
      computeTiltPitches,
      computeStaticPitches,
      playPitches,
    ]
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

  const applyChordWithBorrowing = (chord: Chord) => {
    const newState = getBorrowingStateForChord(
      chord.name,
      borrowingStateRef.current
    );
    setBorrowingState(newState);

    const tonalCenter = tonalCenterRef.current;
    const octaveRange = chordManager.getOctaveRange();
    const displayChord = isElementalName(chord.name)
      ? resolveElementalPlayback(
          chord,
          tonalCenter,
          octaveRange,
          previousChordRef.current
        ).chord
      : chord;

    if (playStyle === 'tilt') {
      const pitches = computeTiltPitches(displayChord, newState);
      previousChordRef.current = chord;
      setSelectedChord(displayChord);
      setActivePitches(pitches);
      if (pitches.length > 0) {
        triggerHaptic();
        audioEngine.triggerAttack(pitches, true);
      }
      return newState;
    }

    const pitches = computeStaticPitches(displayChord, newState);
    previousChordRef.current = chord;
    setSelectedChord(displayChord);
    setActivePitches(pitches);
    if (pitches.length > 0) {
      audioEngine.triggerAttack(pitches);
    }

    return newState;
  };

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
    setPlayStyle,
    activePitches,
    playAndDisplayChord,
    handleChordPointerDown,
    handleChordPointerUp,
    handleChordPointerEnter,
  };
}

