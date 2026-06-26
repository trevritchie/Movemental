import { describe, it, expect } from 'vitest';
import { ChordManager } from './ChordManager';
import {
  getChordRootPitchClass,
  normalizePitchClass,
  relativePitchClass,
} from './pitchClass';

describe('normalizePitchClass', () => {
  it('wraps negative MIDI to 0..11', () => {
    expect(normalizePitchClass(-1)).toBe(11);
    expect(normalizePitchClass(-13)).toBe(11);
  });

  it('leaves 0..11 unchanged', () => {
    expect(normalizePitchClass(0)).toBe(0);
    expect(normalizePitchClass(10)).toBe(10);
    expect(normalizePitchClass(11)).toBe(11);
  });
});

describe('relativePitchClass', () => {
  it('computes offset from tonal center Bb (10)', () => {
    expect(relativePitchClass(10, 10)).toBe(0);
    expect(relativePitchClass(0, 10)).toBe(2);
  });
});

describe('getChordRootPitchClass', () => {
  const manager = new ChordManager();

  it('returns root PC for Branch', () => {
    const branch = manager.getChordByName('Branch');
    expect(branch).toBeDefined();
    expect(getChordRootPitchClass(branch!)).toBe(
      normalizePitchClass(branch!.pitches[branch!.rootPositionIndex])
    );
  });
});
