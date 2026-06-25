import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Chord } from '../music/ChordManager';
import {
  applyNoTiltLocksForChord,
  createEmptyNoTiltChordLockMaps,
  isNoTiltBassLocked,
  isNoTiltVoicingLocked,
  lockNoTiltBass,
  lockNoTiltVoicing,
  type NoTiltChordLockMaps,
  unlockNoTiltBass,
  unlockNoTiltVoicing,
  updateLockedNoTiltBass,
  updateLockedNoTiltVoicing,
} from '../music/noTiltChordLocks';

interface UseNoTiltChordLocksOptions {
  selectedChord: Chord | null;
  setNoTiltVoicingLevel: (level: number) => void;
  setNoTiltPositionLevel: (level: number) => void;
  noTiltVoicingLevelRef: RefObject<number>;
  noTiltPositionLevelRef: RefObject<number>;
}

export function useNoTiltChordLocks({
  selectedChord,
  setNoTiltVoicingLevel,
  setNoTiltPositionLevel,
  noTiltVoicingLevelRef,
  noTiltPositionLevelRef,
}: UseNoTiltChordLocksOptions) {
  const [lockMaps, setLockMaps] = useState<NoTiltChordLockMaps>(
    createEmptyNoTiltChordLockMaps
  );
  const lockMapsRef = useRef(lockMaps);

  useEffect(() => {
    lockMapsRef.current = lockMaps;
  }, [lockMaps]);

  const chordName = selectedChord?.name ?? null;
  const isVoicingLocked =
    chordName !== null && isNoTiltVoicingLocked(lockMaps, chordName);
  const isBassLocked =
    chordName !== null && isNoTiltBassLocked(lockMaps, chordName);

  const clearAllLocks = useCallback(() => {
    setLockMaps(createEmptyNoTiltChordLockMaps());
  }, []);

  const toggleVoicingLock = useCallback(() => {
    if (!chordName) return;
    setLockMaps((prev) => {
      if (isNoTiltVoicingLocked(prev, chordName)) {
        return unlockNoTiltVoicing(prev, chordName);
      }
      return lockNoTiltVoicing(prev, chordName, noTiltVoicingLevelRef.current);
    });
  }, [chordName, noTiltVoicingLevelRef]);

  const toggleBassLock = useCallback(() => {
    if (!chordName) return;
    setLockMaps((prev) => {
      if (isNoTiltBassLocked(prev, chordName)) {
        return unlockNoTiltBass(prev, chordName);
      }
      return lockNoTiltBass(prev, chordName, noTiltPositionLevelRef.current);
    });
  }, [chordName, noTiltPositionLevelRef]);

  const setNoTiltVoicingLevelWithLocks = useCallback(
    (level: number) => {
      setNoTiltVoicingLevel(level);
      if (!chordName) return;
      setLockMaps((prev) => updateLockedNoTiltVoicing(prev, chordName, level));
    },
    [chordName, setNoTiltVoicingLevel]
  );

  const setNoTiltPositionLevelWithLocks = useCallback(
    (level: number) => {
      setNoTiltPositionLevel(level);
      if (!chordName) return;
      setLockMaps((prev) => updateLockedNoTiltBass(prev, chordName, level));
    },
    [chordName, setNoTiltPositionLevel]
  );

  const applyLocksForChord = useCallback(
    (name: string) => {
      applyNoTiltLocksForChord(lockMapsRef.current, name, {
        noTiltVoicingLevelRef,
        noTiltPositionLevelRef,
        setNoTiltVoicingLevel,
        setNoTiltPositionLevel,
      });
    },
    [
      noTiltVoicingLevelRef,
      noTiltPositionLevelRef,
      setNoTiltVoicingLevel,
      setNoTiltPositionLevel,
    ]
  );

  return {
    lockMaps,
    lockMapsRef,
    isVoicingLocked,
    isBassLocked,
    toggleVoicingLock,
    toggleBassLock,
    clearAllLocks,
    setNoTiltVoicingLevel: setNoTiltVoicingLevelWithLocks,
    setNoTiltPositionLevel: setNoTiltPositionLevelWithLocks,
    applyLocksForChord,
  };
}
