/**
 * Per-chord voicing and bass lock state for tap / tap-and-hold play styles.
 */
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
import {
  armNoTiltRevoiceSuppress,
  type NoTiltRevoiceSuppressState,
} from '../music/noTiltRevoiceSuppress';

interface UseNoTiltChordLocksOptions {
  selectedChord: Chord | null;
  setNoTiltVoicingLevel: (level: number) => void;
  setNoTiltPositionLevel: (level: number) => void;
  noTiltVoicingLevelRef: RefObject<number>;
  noTiltPositionLevelRef: RefObject<number>;
  /** Optional: arm re-voice suppress around deferred lock flushes. */
  suppressNoTiltRevoiceRef?: RefObject<NoTiltRevoiceSuppressState>;
}

export function useNoTiltChordLocks({
  selectedChord,
  setNoTiltVoicingLevel,
  setNoTiltPositionLevel,
  noTiltVoicingLevelRef,
  noTiltPositionLevelRef,
  suppressNoTiltRevoiceRef,
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
    (name: string, deferSetState = false) => {
      applyNoTiltLocksForChord(lockMapsRef.current, name, {
        noTiltVoicingLevelRef,
        noTiltPositionLevelRef,
        setNoTiltVoicingLevel,
        setNoTiltPositionLevel,
      }, {
        deferSetState,
        onBeforeDeferredSetState: suppressNoTiltRevoiceRef
          ? () => {
              armNoTiltRevoiceSuppress(suppressNoTiltRevoiceRef.current);
            }
          : undefined,
      });
    },
    [
      noTiltVoicingLevelRef,
      noTiltPositionLevelRef,
      setNoTiltVoicingLevel,
      setNoTiltPositionLevel,
      suppressNoTiltRevoiceRef,
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
