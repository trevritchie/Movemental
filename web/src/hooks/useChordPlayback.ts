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
  staticInversionLevelRef: RefObject<number>;
}

export function useChordPlayback({
  getBorrowingStateForChord,
  borrowingStateRef,
  setBorrowingState,
  setSelectedChord,
  tiltRef,
  staticVoicingLevelRef,
  staticInversionLevelRef,
}: UseChordPlaybackOptions) {
  const [playStyle, setPlayStyle] = useState<PlayStyle>('drone');
  const [activePitches, setActivePitches] = useState<(number | null)[]>([]);

  const isPointerDownRef = useRef(false);
  const playStyleRef = useRef(playStyle);

  useEffect(() => {
    playStyleRef.current = playStyle;
    audioEngine.releaseActiveNotes();
    isPointerDownRef.current = false;
  }, [playStyle]);

  const computeVoicedPitches = useCallback(
    (chord: Chord, state: BorrowingState, tilt: TiltSample): number[] => {
      const structure = borrowingLogic.generatePitchStructure(chord, state);
      const rootPitchClass = chord.pitches[chord.rootPositionIndex] % 12;
      return computeTiltVoicing(
        structure,
        rootPitchClass,
        tilt,
        chordManager.getOctaveRange()
      );
    },
    []
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
          staticInversionLevelRef.current
        )
      ),
    [computeVoicedPitches, staticVoicingLevelRef, staticInversionLevelRef]
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

  const playAndDisplayChord = useCallback(
    (chord: Chord, state: BorrowingState) => {
      if (playStyle === 'tilt') {
        const pitches = computeTiltPitches(chord, state);
        playPitches(pitches, playStyle);
        return;
      }

      const pitches = computeStaticPitches(chord, state);
      playPitches(pitches, playStyle);
    },
    [playStyle, computeTiltPitches, computeStaticPitches, playPitches]
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

    if (playStyle === 'tilt') {
      const pitches = computeTiltPitches(chord, newState);
      setActivePitches(pitches);
      if (pitches.length > 0) {
        triggerHaptic();
        audioEngine.triggerAttack(pitches, true);
      }
      return newState;
    }

    const pitches = computeStaticPitches(chord, newState);
    setActivePitches(pitches);
    if (pitches.length > 0) {
      audioEngine.triggerAttack(pitches);
    }

    return newState;
  };

  const handleChordPointerDown = (chord: Chord) => {
    unlockIosMediaChannel();
    setSelectedChord(chord);
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
      setSelectedChord(chord);
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
