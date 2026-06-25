/**
 * Per-chord and global borrowing slider memory for voice overlay edits.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type { Chord } from '../music/ChordManager';
import {
  getInitialBorrowingState,
  type BorrowingState,
} from '../music/BorrowingLogic';

const ELEMENTAL_CHORD_NAMES = ['Earth', 'Wind', 'Fire'] as const;
const BORROWING_LINE_COUNT = 4;

interface UseBorrowingMemoryOptions {
  selectedChord: Chord | null;
  playAndDisplayChord: (chord: Chord, state: BorrowingState) => void;
}

export function useBorrowingMemory({
  selectedChord,
  playAndDisplayChord,
}: UseBorrowingMemoryOptions) {
  const [borrowingState, setBorrowingState] = useState<BorrowingState>(
    getInitialBorrowingState()
  );
  const borrowingStateRef = useRef(borrowingState);

  useEffect(() => {
    borrowingStateRef.current = borrowingState;
  }, [borrowingState]);

  const [borrowingMemory, setBorrowingMemoryState] = useState<
    'global' | 'per-chord'
  >('per-chord');
  const [chordBorrowingStates, setChordBorrowingStates] = useState<
    Record<string, BorrowingState>
  >({});

  const getBorrowingStateForChord = useCallback(
    (chordName: string, currentGlobalState: BorrowingState): BorrowingState => {
      if ((ELEMENTAL_CHORD_NAMES as readonly string[]).includes(chordName)) {
        return getInitialBorrowingState();
      }
      const chordSaved =
        chordBorrowingStates[chordName] || getInitialBorrowingState();
      const result: BorrowingState = {
        active: currentGlobalState.active,
        chordName: chordName,
        noteStates: { ...currentGlobalState.noteStates },
        borrowingDirections: { ...currentGlobalState.borrowingDirections },
        circlePositions: { ...currentGlobalState.circlePositions },
      };
      if (borrowingMemory === 'per-chord') {
        for (let line = 1; line <= BORROWING_LINE_COUNT; line++) {
          result.noteStates[line] = chordSaved.noteStates[line];
          result.borrowingDirections[line] =
            chordSaved.borrowingDirections[line];
          result.circlePositions[line] = chordSaved.circlePositions[line];
        }
      }
      return result;
    },
    [chordBorrowingStates, borrowingMemory]
  );

  const handleBorrowingStateChange = (newState: BorrowingState) => {
    setBorrowingState(newState);
    if (selectedChord) {
      setChordBorrowingStates(prev => {
        const currentChordState =
          prev[selectedChord.name] || getInitialBorrowingState();
        const updatedChordState = {
          ...currentChordState,
          borrowingDirections: { ...currentChordState.borrowingDirections },
          circlePositions: { ...currentChordState.circlePositions },
          noteStates: { ...currentChordState.noteStates },
        };

        if (borrowingMemory === 'per-chord') {
          for (let line = 1; line <= BORROWING_LINE_COUNT; line++) {
            updatedChordState.borrowingDirections[line] =
              newState.borrowingDirections[line];
            updatedChordState.circlePositions[line] =
              newState.circlePositions[line];
            updatedChordState.noteStates[line] = newState.noteStates[line];
          }
        }

        return {
          ...prev,
          [selectedChord.name]: updatedChordState,
        };
      });
      playAndDisplayChord(selectedChord, newState);
    }
  };

  const setBorrowingMemory = (mode: 'global' | 'per-chord') => {
    setBorrowingMemoryState(mode);
    if (mode === 'per-chord' && selectedChord) {
      setChordBorrowingStates(prev => ({
        ...prev,
        [selectedChord.name]: { ...borrowingStateRef.current },
      }));
    }
  };

  return {
    borrowingState,
    setBorrowingState,
    borrowingStateRef,
    borrowingMemory,
    setBorrowingMemory,
    getBorrowingStateForChord,
    handleBorrowingStateChange,
  };
}
