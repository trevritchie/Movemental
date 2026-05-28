import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import type { Chord } from '../music/ChordManager';
import { borrowingLogic, type BorrowingState } from '../music/BorrowingLogic';
import { audioEngine } from '../audio/AudioEngine';
import type { PlayStyle } from '../context/types';

interface UseChordPlaybackOptions {
  getBorrowingStateForChord: (
    chordName: string,
    currentGlobalState: BorrowingState
  ) => BorrowingState;
  borrowingStateRef: RefObject<BorrowingState>;
  setBorrowingState: (state: BorrowingState) => void;
  setSelectedChord: (chord: Chord | null) => void;
}

export function useChordPlayback({
  getBorrowingStateForChord,
  borrowingStateRef,
  setBorrowingState,
  setSelectedChord,
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

  const playAndDisplayChord = useCallback(
    (chord: Chord, state: BorrowingState) => {
      const pitches = borrowingLogic.generateActivePitches(chord, state);
      setActivePitches(pitches);

      const notesToPlay = pitches.filter((p): p is number => p !== null);
      if (notesToPlay.length > 0) {
        if (playStyle === 'drone') {
          audioEngine.triggerAttack(notesToPlay);
        } else {
          audioEngine.playNotes(notesToPlay, '2n');
        }
      }
    },
    [playStyle]
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

    const pitches = borrowingLogic.generateActivePitches(chord, newState);
    setActivePitches(pitches);

    const notesToPlay = pitches.filter((p): p is number => p !== null);
    if (notesToPlay.length > 0) {
      audioEngine.triggerAttack(notesToPlay);
    }

    return newState;
  };

  const handleChordPointerDown = (chord: Chord) => {
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
