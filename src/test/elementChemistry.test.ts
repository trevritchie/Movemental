import { describe, it, expect } from 'vitest';
import { computeElementFormula } from '../music/elementChemistry';

describe('computeElementFormula', () => {
  it('counts each pitch class once for Branch at Bb', () => {
    expect(computeElementFormula([58, 62, 65, 69], 10)).toEqual({
      earth: 1,
      wind: 2,
      fire: 1,
    });
  });

  it('does not double-count repeated pitch classes in wide voicings', () => {
    // Bb3, Bb4, D4, F4, A4: only one Earth from Bb.
    expect(computeElementFormula([58, 70, 62, 65, 69], 10)).toEqual({
      earth: 1,
      wind: 2,
      fire: 1,
    });
  });

  it('returns null when no pitches are active', () => {
    expect(computeElementFormula([null, null, null, null], 10)).toBeNull();
  });
});
