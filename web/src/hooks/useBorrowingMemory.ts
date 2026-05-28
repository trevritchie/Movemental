import { useState, useCallback, useEffect, useRef } from 'react';
import type { Chord } from '../music/ChordManager';
import {
  getInitialBorrowingState,
  type BorrowingState,
} from '../music/BorrowingLogic';

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
  const [lockedVoices, setLockedVoices] = useState<
    Record<string, Record<number, boolean>>
  >({});

  const getBorrowingStateForChord = useCallback(
    (chordName: string, currentGlobalState: BorrowingState): BorrowingState => {
      if (['Earth', 'Wind', 'Fire'].includes(chordName)) {
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
      for (let line = 1; line <= 4; line++) {
        const isLocked = lockedVoices[chordName]?.[line];
        if (borrowingMemory === 'per-chord' || isLocked) {
          result.noteStates[line] = chordSaved.noteStates[line];
          result.borrowingDirections[line] =
            chordSaved.borrowingDirections[line];
          result.circlePositions[line] = chordSaved.circlePositions[line];
        }
      }
      return result;
    },
    [chordBorrowingStates, lockedVoices, borrowingMemory]
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

        for (let line = 1; line <= 4; line++) {
          const isLocked = lockedVoices[selectedChord.name]?.[line];
          if (borrowingMemory === 'per-chord' || isLocked) {
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

  const toggleVoiceLock = (chordName: string, line: number) => {
    const chordLocks = lockedVoices[chordName] || {};
    const newLocked = !chordLocks[line];

    const newLocksForChord = {
      ...chordLocks,
      [line]: newLocked,
    };

    const newLockedVoices = {
      ...lockedVoices,
      [chordName]: newLocksForChord,
    };

    setLockedVoices(newLockedVoices);

    const nextChordStates = { ...chordBorrowingStates };
    if (newLocked) {
      const currentChordState =
        chordBorrowingStates[chordName] || getInitialBorrowingState();
      nextChordStates[chordName] = {
        ...currentChordState,
        noteStates: {
          ...currentChordState.noteStates,
          [line]: borrowingStateRef.current.noteStates[line],
        },
        borrowingDirections: {
          ...currentChordState.borrowingDirections,
          [line]: borrowingStateRef.current.borrowingDirections[line],
        },
        circlePositions: {
          ...currentChordState.circlePositions,
          [line]: borrowingStateRef.current.circlePositions[line],
        },
      };
      setChordBorrowingStates(nextChordStates);
    }

    if (selectedChord && selectedChord.name === chordName) {
      const chordSaved = nextChordStates[chordName] || getInitialBorrowingState();
      const nextActiveState: BorrowingState = {
        active: borrowingStateRef.current.active,
        chordName: borrowingStateRef.current.chordName,
        noteStates: { ...borrowingStateRef.current.noteStates },
        borrowingDirections: {
          ...borrowingStateRef.current.borrowingDirections,
        },
        circlePositions: { ...borrowingStateRef.current.circlePositions },
      };

      if (borrowingMemory === 'per-chord' || newLocked) {
        nextActiveState.noteStates[line] = chordSaved.noteStates[line];
        nextActiveState.borrowingDirections[line] =
          chordSaved.borrowingDirections[line];
        nextActiveState.circlePositions[line] =
          chordSaved.circlePositions[line];
      }

      setBorrowingState(nextActiveState);
      playAndDisplayChord(selectedChord, nextActiveState);
    }
  };

  return {
    borrowingState,
    setBorrowingState,
    borrowingStateRef,
    borrowingMemory,
    setBorrowingMemory,
    lockedVoices,
    getBorrowingStateForChord,
    handleBorrowingStateChange,
    toggleVoiceLock,
  };
}
