import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import { getInitialBorrowingState } from './BorrowingLogic';
import { FLAT_TILT } from './TiltVoicingEngine';
import {
  getCachedTiltVoicedPitches,
  invalidateVoicingCache,
} from './voicingCache';
import { computeTiltVoicedPitches } from './tiltVoicingPlayback';

describe('voicingCache', () => {
  let manager: ChordManager;

  function cachedBranchPitches(
    tilt: typeof FLAT_TILT,
    tonalCenter: number,
    octaveRange: number
  ) {
    const branch = manager.getChordByName('Branch')!;
    return getCachedTiltVoicedPitches(
      branch,
      getInitialBorrowingState(),
      tilt,
      tonalCenter,
      octaveRange
    );
  }

  beforeEach(() => {
    manager = new ChordManager();
    invalidateVoicingCache();
  });

  it('returns the same array reference for repeated calls with the same inputs', () => {
    const first = cachedBranchPitches(FLAT_TILT, 0, 3);
    const second = cachedBranchPitches(FLAT_TILT, 0, 3);
    expect(second).toBe(first);
  });

  it('recomputes after invalidation', () => {
    const first = cachedBranchPitches(FLAT_TILT, 0, 3);
    invalidateVoicingCache();
    const second = cachedBranchPitches(FLAT_TILT, 0, 3);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });

  it('matches uncached computeTiltVoicedPitches', () => {
    const branch = manager.getChordByName('Branch')!;
    const state = getInitialBorrowingState();
    const cached = cachedBranchPitches({ x: -0.25, y: 0 }, 0, 3);
    const direct = computeTiltVoicedPitches(
      branch,
      state,
      { x: -0.25, y: 0 },
      0,
      3
    );
    expect(cached).toEqual(direct);
  });
});
