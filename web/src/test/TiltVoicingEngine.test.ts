// Reference cases derived from Movements-Not-Chords/mnc.py.
// The C major sixth chord (Branch at tonal center C) with pivot home at
// MIDI 60 mirrors the Python defaults (C major sixth diminished scale,
// on-chord lock, pivotPitch = 60), so expected voicings below match the
// Python thinning output, with oblique roll expansion (flat = widest).

import { describe, it, expect } from 'vitest';
import {
  buildToneCycle,
  ladderPitch,
  mapTiltToPositions,
  tiltSampleFromLevels,
  obliqueMotion,
  computeTiltVoicing,
  voicingWidthFromTilt,
  tiltVoicingLevelName,
  tiltInversionLevelName,
  TILT_VOICING_LEVEL_NAMES,
  TILT_INVERSION_LEVEL_NAMES,
  TILT_INVERSION_DESKTOP_LABELS,
  FLAT_TILT,
} from '../music/TiltVoicingEngine';

// Branch at tonal center C: C E G A, root C, pre-voicing structure.
const BRANCH = [0, 4, 7, 9];
const BRANCH_CYCLE = [0, 4, 7, 9];
const OCTAVE_RANGE = 3; // default, home pivot = 0 + 12 * 5 = 60

// Nine evenly spaced roll stops from vertical to flat.
const ROLL_STOPS = [
  { x: -1, name: 'Unison' },
  { x: -0.875, name: 'Third' },
  { x: -0.75, name: 'Triad' },
  { x: -0.625, name: 'Close' },
  { x: -0.5, name: 'Octave' },
  { x: -0.375, name: 'Drop 2' },
  { x: -0.25, name: 'Drop 3' },
  { x: -0.125, name: 'Drop 2&4' },
  { x: 0, name: 'Double Octave' },
];

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
  it('maps flat to the widest roll position and root parallel level', () => {
    expect(mapTiltToPositions({ x: 0, y: 0 })).toEqual({
      inputSteps: 8,
      parallelSteps: 0,
    });
  });

  it('maps fully vertical roll to zero steps', () => {
    expect(mapTiltToPositions({ x: -1, y: 0 })).toEqual({
      inputSteps: 0,
      parallelSteps: 0,
    });
  });

  it('maps full chest-ward pitch to third inversion', () => {
    expect(mapTiltToPositions({ x: -1, y: -1 })).toEqual({
      inputSteps: 0,
      parallelSteps: 3,
    });
  });

  it('clamps values outside [-1, 0]', () => {
    expect(mapTiltToPositions({ x: 0.7, y: -2 })).toEqual({
      inputSteps: 8,
      parallelSteps: 3,
    });
  });
});

describe('tiltVoicingLevelName', () => {
  it('maps all nine roll stops to voicing level names', () => {
    for (const { x, name } of ROLL_STOPS) {
      expect(tiltVoicingLevelName({ x, y: 0 })).toBe(name);
    }
  });

  it('is unchanged by pitch tilt', () => {
    expect(tiltVoicingLevelName({ x: -0.5, y: -1 })).toBe('Octave');
  });

  it('lists all nine voicing level names in chain-width order', () => {
    expect(TILT_VOICING_LEVEL_NAMES).toEqual([
      'Unison',
      'Third',
      'Triad',
      'Close',
      'Octave',
      'Drop 2',
      'Drop 3',
      'Drop 2&4',
      'Double Octave',
    ]);
  });

  it('maps each roll stop width to its name', () => {
    for (let i = 0; i < ROLL_STOPS.length; i++) {
      const { x } = ROLL_STOPS[i];
      const width = i + 1;
      expect(voicingWidthFromTilt({ x, y: 0 })).toBe(width);
      expect(tiltVoicingLevelName({ x, y: 0 })).toBe(
        TILT_VOICING_LEVEL_NAMES[width - 1]
      );
    }
  });
});

describe('tiltSampleFromLevels', () => {
  it('round-trips discrete voicing and inversion levels', () => {
    for (let inputSteps = 0; inputSteps <= 8; inputSteps++) {
      for (let parallelSteps = 0; parallelSteps <= 3; parallelSteps++) {
        const sample = tiltSampleFromLevels(inputSteps, parallelSteps);
        expect(mapTiltToPositions(sample)).toEqual({
          inputSteps,
          parallelSteps,
        });
      }
    }
  });
});

describe('tiltInversionLevelName', () => {
  it('maps pitch tilt to parallel inversion labels', () => {
    expect(tiltInversionLevelName({ x: 0, y: 0 })).toBe('Root');
    expect(tiltInversionLevelName({ x: 0, y: -0.34 })).toBe('First');
    expect(tiltInversionLevelName({ x: 0, y: -0.67 })).toBe('Second');
    expect(tiltInversionLevelName({ x: 0, y: -1 })).toBe('Third');
  });

  it('lists four inversion level names', () => {
    expect(TILT_INVERSION_LEVEL_NAMES).toEqual([
      'Root',
      'First',
      'Second',
      'Third',
    ]);
    expect(TILT_INVERSION_DESKTOP_LABELS).toEqual([
      'Root Inv.',
      'First Inv.',
      'Second Inv.',
      'Third Inv.',
    ]);
  });
});

describe('obliqueMotion', () => {
  it('plays the single pivot note at width 1', () => {
    expect(obliqueMotion(0, 1, BRANCH_CYCLE, 60)).toEqual([60]);
  });

  it('adds one note above the pivot at width 2 (Third)', () => {
    expect(obliqueMotion(0, 2, BRANCH_CYCLE, 60)).toEqual([60, 64]);
  });

  it('adds one note below at width 3 (Triad)', () => {
    expect(obliqueMotion(0, 3, BRANCH_CYCLE, 60)).toEqual([57, 60, 64]);
  });

  it('builds a four-note close stack at width 4', () => {
    expect(obliqueMotion(0, 4, BRANCH_CYCLE, 60)).toEqual([57, 60, 64, 67]);
  });

  it('plays all five notes at width 5 (Octave) without thinning', () => {
    expect(obliqueMotion(0, 5, BRANCH_CYCLE, 60)).toEqual([
      55, 57, 60, 64, 67,
    ]);
  });

  it('thins width 6 with the drop 2 rule', () => {
    expect(obliqueMotion(0, 6, BRANCH_CYCLE, 60)).toEqual([55, 60, 64, 69]);
  });

  it('thins width 7 with the drop 3 rule', () => {
    expect(obliqueMotion(0, 7, BRANCH_CYCLE, 60)).toEqual([
      52, 55, 60, 64, 69,
    ]);
  });

  it('thins width 8 with the drop 2 and 4 rule', () => {
    expect(obliqueMotion(0, 8, BRANCH_CYCLE, 60)).toEqual([
      52, 57, 64, 67, 72,
    ]);
  });

  it('thins the double octave chord (width 9)', () => {
    expect(obliqueMotion(0, 9, BRANCH_CYCLE, 60)).toEqual([
      48, 57, 64, 67, 72,
    ]);
  });

  it('anchors expansion on a non-zero pivot', () => {
    expect(obliqueMotion(2, 3, BRANCH_CYCLE, 60)).toEqual([64, 67, 69]);
  });

  it('returns empty for an empty cycle', () => {
    expect(obliqueMotion(0, 9, [], 60)).toEqual([]);
  });
});

describe('computeTiltVoicing', () => {
  it('plays the widest voicing when flat (reversed from Python)', () => {
    expect(computeTiltVoicing(BRANCH, 0, FLAT_TILT, OCTAVE_RANGE, 0)).toEqual([
      48, 57, 64, 67, 72,
    ]);
  });

  it('narrows to the single pivot note when fully vertical', () => {
    expect(
      computeTiltVoicing(BRANCH, 0, { x: -1, y: 0 }, OCTAVE_RANGE, 0)
    ).toEqual([60]);
  });

  it('plays Third (note above pivot) at the second roll stop', () => {
    expect(
      computeTiltVoicing(BRANCH, 0, { x: -0.875, y: 0 }, OCTAVE_RANGE, 0)
    ).toEqual([60, 64]);
  });

  it('plays the first-inversion bass when parallel level 1 and vertical', () => {
    expect(
      computeTiltVoicing(BRANCH, 0, { x: -1, y: -0.34 }, OCTAVE_RANGE, 0)
    ).toEqual([64]);
  });

  it('plays the second-inversion bass when parallel level 2 and vertical', () => {
    expect(
      computeTiltVoicing(BRANCH, 0, { x: -1, y: -0.67 }, OCTAVE_RANGE, 0)
    ).toEqual([67]);
  });

  it('plays the wide first-inversion voicing when parallel 1 and flat', () => {
    expect(
      computeTiltVoicing(BRANCH, 0, { x: 0, y: -0.34 }, OCTAVE_RANGE, 0)
    ).toEqual(obliqueMotion(1, 9, BRANCH_CYCLE, 60));
  });

  it('plays a three-note stack at parallel 2 with partial roll', () => {
    expect(
      computeTiltVoicing(BRANCH, 0, { x: -0.75, y: -0.67 }, OCTAVE_RANGE, 0)
    ).toEqual([64, 67, 69]);
  });

  it('voices a minor sixth cycle (Trunk) correctly when flat', () => {
    const trunk = [0, 3, 7, 9]; // C Eb G A
    expect(computeTiltVoicing(trunk, 0, FLAT_TILT, OCTAVE_RANGE, 0)).toEqual([
      48, 57, 63, 67, 72,
    ]);
  });

  it('voices a borrowed (mixed) cycle', () => {
    // Branch with the second voice borrowed up into Fire: C F G A.
    const borrowed = [0, 5, 7, 9];
    expect(
      computeTiltVoicing(borrowed, 0, { x: -0.5, y: 0 }, OCTAVE_RANGE, 0)
    ).toEqual([55, 57, 60, 65, 67]);
  });

  it('follows the octave range setting', () => {
    expect(computeTiltVoicing(BRANCH, 0, { x: -1, y: 0 }, 1, 0)).toEqual([36]);
  });

  it('handles a non-zero root pitch class', () => {
    // Branch at tonal center Bb: root pc 10, home = 10 + 60 = 70.
    expect(
      computeTiltVoicing(
        [10, 14, 17, 19],
        10,
        { x: -1, y: 0 },
        OCTAVE_RANGE,
        10
      )
    ).toEqual([70]);
  });

  it('keeps Fire contrary to Branch when tonal center is Bb', () => {
    // Fire default root A (9), pivot one semitone below Branch (70) -> 69.
    expect(
      computeTiltVoicing(
        [0, 3, 6, 9],
        9,
        { x: -1, y: 0 },
        OCTAVE_RANGE,
        10,
        69
      )
    ).toEqual([69]);
  });

  it('returns empty when all voices are off', () => {
    expect(
      computeTiltVoicing([null, null, null, null], 0, FLAT_TILT, OCTAVE_RANGE, 0)
    ).toEqual([]);
  });
});
