// TiltVoicingEngine.ts
// Port of the tilt-to-counterpoint mechanic from "Movements, Not Chords"
// (Movements-Not-Chords/mnc.py). See docs/movements-not-chords-tilt.md.
//
// The engine voices a chord on a "tone cycle": the pitch classes of the
// post-borrowing chord, expressed as ascending semitone offsets from the
// chord root. One ladder step equals one chord tone. Rolling the phone
// expands the voicing in contrary motion around a pivot; pitching the phone
// toward the chest raises the pivot for oblique motion.
//
// The roll response is deliberately reversed from the Python original:
// flat = widest voicing (double octave chord), fully vertical = single note.

import { OCTAVE } from './config';

export interface TiltSample {
  // Normalized tilt, each axis in [-1, 0]. 0 = phone flat.
  // x: roll toward vertical drives x to -1.
  // y: pitch toward the chest drives y to -1.
  x: number;
  y: number;
}

export const FLAT_TILT: TiltSample = { x: 0, y: 0 };

// Maximum chord-tone steps the bottom anchor sits below the home pivot
// (4 steps = one octave on a 4-tone cycle, giving the 9-note double octave
// chain when flat) and the pivot rises above home (one octave of oblique
// reach, mirroring the Python range of 9 scale degrees).
const MAX_INPUT_STEPS = 4;
const MAX_PIVOT_STEPS = 4;

// Cap matching mnc.py: never build a chain wider than the double octave
// chord, so extreme oblique motion still produces a playable voicing.
const MAX_CHAIN_WIDTH = 9;

// Thinning rules from mnc.py contraryMotion ("like how I play it on piano",
// max 5 voices). Keyed by chain width; values are 1-indexed chain positions
// to skip, counted from the bottom.
const THINNING_RULES: Record<number, number[]> = {
  5: [3],          // octave chord
  6: [2, 5],       // drop 2
  7: [3, 6],       // drop 3
  8: [2, 4, 7],    // drop 2 and 4
  9: [2, 3, 5, 8], // double octave chord
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Build the tone cycle from a pre-voicing pitch structure.
 *
 * Returns ascending unique semitone offsets from the chord root pitch class,
 * e.g. Branch in C: [0, 4, 7, 9]. Offsets need not include 0 (the root voice
 * may be borrowed away or toggled off).
 */
export function buildToneCycle(
  pitchStructure: (number | null)[],
  rootPitchClass: number
): number[] {
  const offsets = new Set<number>();
  for (const pitch of pitchStructure) {
    if (pitch === null) continue;
    offsets.add((((pitch % OCTAVE) - rootPitchClass) % OCTAVE + OCTAVE) % OCTAVE);
  }
  return Array.from(offsets).sort((a, b) => a - b);
}

/**
 * Pitch at integer ladder position k, where position 0 is the first cycle
 * tone at or above baseMidi and each step moves one chord tone. Negative
 * positions descend below baseMidi.
 */
export function ladderPitch(
  cycle: number[],
  baseMidi: number,
  k: number
): number {
  const len = cycle.length;
  const idx = ((k % len) + len) % len;
  const octaveShift = Math.floor(k / len);
  return baseMidi + cycle[idx] + octaveShift * OCTAVE;
}

/**
 * Map a normalized tilt sample to integer ladder steps.
 *
 * Roll (x) is REVERSED relative to mnc.py: flat (x = 0) puts the bottom
 * anchor MAX_INPUT_STEPS below the pivot home (widest chord), and fully
 * vertical (x = -1) puts it at the pivot (single note). Pitch tilt (y)
 * matches mnc.py: flat leaves the pivot at home, full chest-ward tilt
 * raises it MAX_PIVOT_STEPS.
 */
export function mapTiltToPositions(tilt: TiltSample): {
  inputSteps: number;
  pivotSteps: number;
} {
  const x = clamp(tilt.x, -1, 0);
  const y = clamp(tilt.y, -1, 0);
  return {
    inputSteps: Math.round((x + 1) * MAX_INPUT_STEPS),
    pivotSteps: Math.round(Math.abs(y) * MAX_PIVOT_STEPS),
  };
}

/**
 * Port of mnc.py contraryMotion, in chord-tone steps.
 *
 * Builds the chain of cycle tones from the bottom anchor upward. The chain
 * width is 1 + 2 * (steps from bottom to pivot), so the top of the chain is
 * the mirror image of the bottom across the pivot: rolling the phone moves
 * the bottom down and the top up simultaneously. Wide chains are thinned to
 * at most 5 voices using the drop-voicing rules from the Python version.
 */
export function contraryMotion(
  bottomPosition: number,
  pivotPosition: number,
  cycle: number[],
  baseMidi: number
): number[] {
  if (cycle.length === 0) return [];

  // At or above the pivot: a single note, the "phone vertical" sound.
  if (bottomPosition >= pivotPosition) {
    return [ladderPitch(cycle, baseMidi, pivotPosition)];
  }

  const stepsToPivot = pivotPosition - bottomPosition;
  const width = Math.min(1 + 2 * stepsToPivot, MAX_CHAIN_WIDTH);
  const skips = THINNING_RULES[width] ?? [];

  const chord: number[] = [];
  for (let note = 1; note <= width; note++) {
    if (skips.includes(note)) continue;
    chord.push(ladderPitch(cycle, baseMidi, bottomPosition + (note - 1)));
  }
  return chord;
}

/**
 * Compute the full tilt voicing for a chord.
 *
 * pitchStructure: pre-voicing pitches from BorrowingLogic (4 slots, nulls
 * for voices toggled off). rootPitchClass: pitch class of the chord root.
 * octaveRange: the app's octave range setting, used to place the register.
 */
export function computeTiltVoicing(
  pitchStructure: (number | null)[],
  rootPitchClass: number,
  tilt: TiltSample,
  octaveRange: number
): number[] {
  const cycle = buildToneCycle(pitchStructure, rootPitchClass);
  if (cycle.length === 0) return [];

  // Home register: the chord root two octaves above the octave-range base,
  // so the double octave chord below it spans the app's normal register.
  const homeMidi = rootPitchClass + OCTAVE * (octaveRange + 2);

  const { inputSteps, pivotSteps } = mapTiltToPositions(tilt);
  return contraryMotion(-inputSteps, pivotSteps, cycle, homeMidi);
}
