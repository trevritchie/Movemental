import { describe, it, expect } from 'vitest';
import { pitchTiltFromBeta } from './useDeviceTilt';

describe('useDeviceTilt mapping', () => {
  it('maps chest-ward pitch to negative y', () => {
    expect(pitchTiltFromBeta(45)).toBe(-0.5);
    expect(pitchTiltFromBeta(90)).toBe(-1);
  });

  it('maps away-from-chest pitch to positive y', () => {
    expect(pitchTiltFromBeta(-45)).toBe(0.5);
  });

  it('maps flat pitch to zero', () => {
    expect(pitchTiltFromBeta(0)).toBe(0);
  });
});
