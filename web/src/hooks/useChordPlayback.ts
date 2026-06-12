import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import { chordManager, type Chord } from '../music/ChordManager';
import { borrowingLogic, type BorrowingState } from '../music/BorrowingLogic';
import { computeTiltVoicing, type TiltSample } from '../music/TiltVoicingEngine';
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
}

export function useChordPlayback({
  getBorrowingStateForChord,
  borrowingStateRef,
  setBorrowingState,
  setSelectedChord,
  tiltRef,
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

  // Tilt play style: voice the post-borrowing chord with the MNC contrary
  // and oblique motion engine, sampling the device tilt at tap time.
  const computeTiltPitches = useCallback(
    (chord: Chord, state: BorrowingState): number[] => {
      const structure = borrowingLogic.generatePitchStructure(chord, state);
      const rootPitchClass = chord.pitches[chord.rootPositionIndex] % 12;
      return computeTiltVoicing(
        structure,
        rootPitchClass,
        tiltRef.current,
        chordManager.getOctaveRange()
      );
    },
    [tiltRef]
  );

  const playAndDisplayChord = useCallback(
    (chord: Chord, state: BorrowingState) => {
      if (playStyle === 'tilt') {
        const pitches = computeTiltPitches(chord, state);
        setActivePitches(pitches);
        if (pitches.length > 0) {
          audioEngine.triggerAttack(pitches);
        }
        return;
      }

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
    [playStyle, computeTiltPitches]
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
        // Retrigger: an explicit tap should re-strike the chord even when
        // the tilt (and thus the voicing) is unchanged.
        audioEngine.triggerAttack(pitches, true);
      }
      return newState;
    }

    const pitches = borrowingLogic.generateActivePitches(chord, newState);
    setActivePitches(pitches);

    const notesToPlay = pitches.filter((p): p is number => p !== null);
    if (notesToPlay.length > 0) {
      audioEngine.triggerAttack(notesToPlay);
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
