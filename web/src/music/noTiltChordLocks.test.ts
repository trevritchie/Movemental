import { describe, it, expect } from 'vitest';
import {
  applyNoTiltLocksForChord,
  createEmptyNoTiltChordLockMaps,
  effectiveNoTiltBassLevel,
  effectiveNoTiltVoicingLevel,
  getLockedNoTiltBass,
  getLockedNoTiltVoicing,
  isNoTiltBassLocked,
  isNoTiltVoicingLocked,
  lockNoTiltBass,
  lockNoTiltVoicing,
  unlockNoTiltBass,
  unlockNoTiltVoicing,
  updateLockedNoTiltVoicing,
} from './noTiltChordLocks';

describe('noTiltChordLocks', () => {
  it('tracks voicing and bass locks independently per chord', () => {
    let maps = createEmptyNoTiltChordLockMaps();
    maps = lockNoTiltVoicing(maps, 'Branch', 5);
    maps = lockNoTiltBass(maps, 'Flame', 2);

    expect(isNoTiltVoicingLocked(maps, 'Branch')).toBe(true);
    expect(isNoTiltBassLocked(maps, 'Branch')).toBe(false);
    expect(getLockedNoTiltVoicing(maps, 'Branch')).toBe(5);
    expect(getLockedNoTiltBass(maps, 'Flame')).toBe(2);
  });

  it('removes a lock when unlocked', () => {
    let maps = lockNoTiltVoicing(createEmptyNoTiltChordLockMaps(), 'Branch', 3);
    maps = unlockNoTiltVoicing(maps, 'Branch');
    expect(isNoTiltVoicingLocked(maps, 'Branch')).toBe(false);
  });

  it('updates stored level while locked', () => {
    let maps = lockNoTiltVoicing(createEmptyNoTiltChordLockMaps(), 'Branch', 3);
    maps = updateLockedNoTiltVoicing(maps, 'Branch', 7);
    expect(getLockedNoTiltVoicing(maps, 'Branch')).toBe(7);
  });

  it('applies locked levels into refs and setters', () => {
    const maps = lockNoTiltBass(
      lockNoTiltVoicing(createEmptyNoTiltChordLockMaps(), 'Branch', 4),
      'Branch',
      6
    );
    const voicingRef = { current: 0 };
    const bassRef = { current: 0 };
    const voicingLevels: number[] = [];
    const bassLevels: number[] = [];

    applyNoTiltLocksForChord(maps, 'Branch', {
      noTiltVoicingLevelRef: voicingRef,
      noTiltPositionLevelRef: bassRef,
      setNoTiltVoicingLevel: (level) => voicingLevels.push(level),
      setNoTiltPositionLevel: (level) => bassLevels.push(level),
    });

    expect(voicingRef.current).toBe(4);
    expect(bassRef.current).toBe(6);
    expect(voicingLevels).toEqual([4]);
    expect(bassLevels).toEqual([6]);
  });

  it('returns locked levels from effective helpers', () => {
    const maps = lockNoTiltBass(
      lockNoTiltVoicing(createEmptyNoTiltChordLockMaps(), 'Branch', 2),
      'Branch',
      5
    );
    expect(effectiveNoTiltVoicingLevel(maps, 'Branch', 7)).toBe(2);
    expect(effectiveNoTiltBassLevel(maps, 'Branch', 4)).toBe(5);
    expect(effectiveNoTiltVoicingLevel(maps, 'Flame', 7)).toBe(7);
  });

  it('does not apply unlock helper to unrelated chords', () => {
    const maps = lockNoTiltVoicing(createEmptyNoTiltChordLockMaps(), 'Branch', 1);
    const unlocked = unlockNoTiltBass(maps, 'Branch');
    expect(unlocked).toBe(maps);
  });
});
