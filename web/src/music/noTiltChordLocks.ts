/**
 * Per-chord voicing and bass locks for no-tilt play styles.
 * Presence in a map means the lock is ON for that chord name.
 */
export interface NoTiltChordLockMaps {
  voicing: Record<string, number>;
  bass: Record<string, number>;
}

export function createEmptyNoTiltChordLockMaps(): NoTiltChordLockMaps {
  return { voicing: {}, bass: {} };
}

export function isNoTiltVoicingLocked(
  maps: NoTiltChordLockMaps,
  chordName: string
): boolean {
  return Object.prototype.hasOwnProperty.call(maps.voicing, chordName);
}

export function isNoTiltBassLocked(
  maps: NoTiltChordLockMaps,
  chordName: string
): boolean {
  return Object.prototype.hasOwnProperty.call(maps.bass, chordName);
}

export function getLockedNoTiltVoicing(
  maps: NoTiltChordLockMaps,
  chordName: string
): number | undefined {
  return maps.voicing[chordName];
}

export function getLockedNoTiltBass(
  maps: NoTiltChordLockMaps,
  chordName: string
): number | undefined {
  return maps.bass[chordName];
}

export function lockNoTiltVoicing(
  maps: NoTiltChordLockMaps,
  chordName: string,
  level: number
): NoTiltChordLockMaps {
  return {
    ...maps,
    voicing: { ...maps.voicing, [chordName]: level },
  };
}

export function lockNoTiltBass(
  maps: NoTiltChordLockMaps,
  chordName: string,
  level: number
): NoTiltChordLockMaps {
  return {
    ...maps,
    bass: { ...maps.bass, [chordName]: level },
  };
}

export function unlockNoTiltVoicing(
  maps: NoTiltChordLockMaps,
  chordName: string
): NoTiltChordLockMaps {
  if (!isNoTiltVoicingLocked(maps, chordName)) {
    return maps;
  }
  const voicing = { ...maps.voicing };
  delete voicing[chordName];
  return { ...maps, voicing };
}

export function unlockNoTiltBass(
  maps: NoTiltChordLockMaps,
  chordName: string
): NoTiltChordLockMaps {
  if (!isNoTiltBassLocked(maps, chordName)) {
    return maps;
  }
  const bass = { ...maps.bass };
  delete bass[chordName];
  return { ...maps, bass };
}

export function updateLockedNoTiltVoicing(
  maps: NoTiltChordLockMaps,
  chordName: string,
  level: number
): NoTiltChordLockMaps {
  if (!isNoTiltVoicingLocked(maps, chordName)) {
    return maps;
  }
  return lockNoTiltVoicing(maps, chordName, level);
}

export function updateLockedNoTiltBass(
  maps: NoTiltChordLockMaps,
  chordName: string,
  level: number
): NoTiltChordLockMaps {
  if (!isNoTiltBassLocked(maps, chordName)) {
    return maps;
  }
  return lockNoTiltBass(maps, chordName, level);
}

export interface ApplyNoTiltLocksTarget {
  noTiltVoicingLevelRef: { current: number };
  noTiltPositionLevelRef: { current: number };
  setNoTiltVoicingLevel: (level: number) => void;
  setNoTiltPositionLevel: (level: number) => void;
}

/** Restore locked dropdown levels for a chord into refs and React state. */
export function applyNoTiltLocksForChord(
  maps: NoTiltChordLockMaps,
  chordName: string,
  target: ApplyNoTiltLocksTarget,
  options: { deferSetState?: boolean } = {}
): void {
  const schedule = (fn: () => void) => {
    if (options.deferSetState) {
      queueMicrotask(fn);
    } else {
      fn();
    }
  };

  if (isNoTiltVoicingLocked(maps, chordName)) {
    const level = getLockedNoTiltVoicing(maps, chordName)!;
    target.noTiltVoicingLevelRef.current = level;
    schedule(() => target.setNoTiltVoicingLevel(level));
  }
  if (isNoTiltBassLocked(maps, chordName)) {
    const level = getLockedNoTiltBass(maps, chordName)!;
    target.noTiltPositionLevelRef.current = level;
    schedule(() => target.setNoTiltPositionLevel(level));
  }
}

export function effectiveNoTiltVoicingLevel(
  maps: NoTiltChordLockMaps,
  chordName: string,
  fallback: number
): number {
  if (isNoTiltVoicingLocked(maps, chordName)) {
    return getLockedNoTiltVoicing(maps, chordName)!;
  }
  return fallback;
}

export function effectiveNoTiltBassLevel(
  maps: NoTiltChordLockMaps,
  chordName: string,
  fallback: number
): number {
  if (isNoTiltBassLocked(maps, chordName)) {
    return getLockedNoTiltBass(maps, chordName)!;
  }
  return fallback;
}
