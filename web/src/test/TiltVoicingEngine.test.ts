// Reference cases derived from Movements-Not-Chords/mnc.py.
// The C major sixth chord (Branch at tonal center C) with pivot home at
// MIDI 60 mirrors the Python defaults (C major sixth diminished scale,
// on-chord lock, pivotPitch = 60), so expected voicings below match the
// Python contraryMotion output, with the roll axis reversed (flat = widest).

import { describe, it, expect } from 'vitest';
import {
  buildToneCycle,
  ladderPitch,
  mapTiltToPositions,
  contraryMotion,
  computeTiltVoicing,
  FLAT_TILT,
} from '../music/TiltVoicingEngine';

// Branch at tonal center C: C E G A, root C, pre-voicing structure.
const BRANCH = [0, 4, 7, 9];
const BRANCH_CYCLE = [0, 4, 7, 9];
const OCTAVE_RANGE = 3; // default, home pivot = 0 + 12 * 5 = 60

describe('buildToneCycle', () => {
  it('returns ascending offsets from the root pitch class', () => {
    expect(buildToneCycle(BRANCH, 0)).toEqual([0, 4, 7, 9]);
  });

  it('rotates offsets around a non-zero root', () => {
    // Branch at tonal center Bb: pitches Bb D F G (10, 14, 17, 19), root Bb.
    expect(buildToneCycle([10, 14, 17, 19], 10)).toEqual([0, 4, 7, 9]);
  });

  it('skips nulls and deduplicates pitch classes', () => {
    expect(buildToneCycle([10, 2, null, 19], 10)).toEqual([0, 4, 9]);
    expect(buildToneCycle([0, 12, 7, null], 0)).toEqual([0, 7]);
  });

  it('returns empty for an empty structure', () => {
    expect(buildToneCycle([null, null, null, null], 0)).toEqual([]);
  });
});

describe('ladderPitch', () => {
  it('walks the cycle upward from the base', () => {
    expect(ladderPitch(BRANCH_CYCLE, 60, 0)).toBe(60);
    expect(ladderPitch(BRANCH_CYCLE, 60, 1)).toBe(64);
    expect(ladderPitch(BRANCH_CYCLE, 60, 3)).toBe(69);
    expect(ladderPitch(BRANCH_CYCLE, 60, 4)).toBe(72);
  });

  it('walks downward for negative positions', () => {
    expect(ladderPitch(BRANCH_CYCLE, 60, -1)).toBe(57);
    expect(ladderPitch(BRANCH_CYCLE, 60, -4)).toBe(48);
    expect(ladderPitch(BRANCH_CYCLE, 60, -8)).toBe(36);
  });
});

describe('mapTiltToPositions', () => {
  it('maps flat to the widest roll position and home pivot', () => {
    expect(mapTiltToPositions({ x: 0, y: 0 })).toEqual({
      inputSteps: 4,
      pivotSteps: 0,
    });
  });

  it('maps fully vertical roll to zero steps', () => {
    expect(mapTiltToPositions({ x: -1, y: 0 })).toEqual({
      inputSteps: 0,
      pivotSteps: 0,
    });
  });

  it('maps full chest-ward pitch to the raised pivot', () => {
    expect(mapTiltToPositions({ x: -1, y: -1 })).toEqual({
      inputSteps: 0,
      pivotSteps: 4,
    });
  });

  it('clamps values outside [-1, 0]', () => {
    expect(mapTiltToPositions({ x: 0.7, y: -2 })).toEqual({
      inputSteps: 4,
      pivotSteps: 4,
    });
  });
});

describe('contraryMotion', () => {
  it('plays the single pivot note when the bottom anchor reaches the pivot', () => {
    expect(contraryMotion(0, 0, BRANCH_CYCLE, 60)).toEqual([60]);
    expect(contraryMotion(2, 0, BRANCH_CYCLE, 60)).toEqual([60]);
  });

  it('builds a plain three-note stack at width 3', () => {
    expect(contraryMotion(-1, 0, BRANCH_CYCLE, 60)).toEqual([57, 60, 64]);
  });

  it('thins the octave chord (width 5) by dropping the middle note', () => {
    // Python: chain 55 57 60 64 67, skip note 3.
    expect(contraryMotion(-2, 0, BRANCH_CYCLE, 60)).toEqual([55, 57, 64, 67]);
  });

  it('thins width 7 with the drop 3 rule', () => {
    // Python: chain 52 55 57 60 64 67 69, skip notes 3 and 6.
    expect(contraryMotion(-3, 0, BRANCH_CYCLE, 60)).toEqual([
      52, 55, 60, 64, 69,
    ]);
  });

  it('thins the double octave chord (width 9)', () => {
    // Python: chain 48 52 55 57 60 64 67 69 72, skip notes 2, 3, 5, 8.
    expect(contraryMotion(-4, 0, BRANCH_CYCLE, 60)).toEqual([
      48, 57, 64, 67, 72,
    ]);
  });

  it('caps extreme spreads at the double octave width, like Python', () => {
    // Bottom 4 below home, pivot 4 above home: 8 steps apart, width capped
    // at 9, so the chain matches the flat-roll double octave chord.
    expect(contraryMotion(-4, 4, BRANCH_CYCLE, 60)).toEqual([
      48, 57, 64, 67, 72,
    ]);
  });

  it('returns empty for an empty cycle', () => {
    expect(contraryMotion(-4, 0, [], 60)).toEqual([]);
  });
});

describe('computeTiltVoicing', () => {
  it('plays the widest voicing when flat (reversed from Python)', () => {
    expect(computeTiltVoicing(BRANCH, 0, FLAT_TILT, OCTAVE_RANGE)).toEqual([
      48, 57, 64, 67, 72,
    ]);
  });

  it('narrows to the single pivot note when fully vertical', () => {
    expect(
      computeTiltVoicing(BRANCH, 0, { x: -1, y: 0 }, OCTAVE_RANGE)
    ).toEqual([60]);
  });

  it('raises the pivot with chest-ward pitch tilt (oblique motion)', () => {
    // Bottom anchor at home, pivot 4 chord tones up: chain 60..84,
    // thinned with the double octave rule.
    expect(
      computeTiltVoicing(BRANCH, 0, { x: -1, y: -1 }, OCTAVE_RANGE)
    ).toEqual([60, 69, 76, 79, 84]);
  });

  it('voices a minor sixth cycle (Trunk) correctly when flat', () => {
    const trunk = [0, 3, 7, 9]; // C Eb G A
    expect(computeTiltVoicing(trunk, 0, FLAT_TILT, OCTAVE_RANGE)).toEqual([
      48, 57, 63, 67, 72,
    ]);
  });

  it('voices a borrowed (mixed) cycle', () => {
    // Branch with the second voice borrowed up into Fire: C F G A.
    const borrowed = [0, 5, 7, 9];
    expect(
      computeTiltVoicing(borrowed, 0, { x: -0.5, y: 0 }, OCTAVE_RANGE)
    ).toEqual([55, 57, 65, 67]);
  });

  it('follows the octave range setting', () => {
    expect(computeTiltVoicing(BRANCH, 0, { x: -1, y: 0 }, 1)).toEqual([36]);
  });

  it('handles a non-zero root pitch class', () => {
    // Branch at tonal center Bb: root pc 10, home = 10 + 60 = 70.
    expect(
      computeTiltVoicing([10, 14, 17, 19], 10, { x: -1, y: 0 }, OCTAVE_RANGE)
    ).toEqual([70]);
  });

  it('returns empty when all voices are off', () => {
    expect(
      computeTiltVoicing([null, null, null, null], 0, FLAT_TILT, OCTAVE_RANGE)
    ).toEqual([]);
  });
});
