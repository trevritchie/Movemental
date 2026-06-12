// TiltVoicingEngine.ts
// Port of the tilt-to-counterpoint mechanic from "Movements, Not Chords"
// (Movements-Not-Chords/mnc.py). See docs/movements-not-chords-tilt.md.
//
// The engine voices a chord on a "tone cycle": the pitch classes of the
// post-borrowing chord, expressed as ascending semitone offsets from the
// chord root. One ladder step equals one chord tone. Rolling the phone
// expands the voicing in oblique motion from a pivot (alternating notes
// above and below); pitching the phone toward the sky cycles parallel
// inversions (each voice moves up one chord tone on the ladder).
//
// The roll response is deliberately reversed from the Python original:
// flat = widest voicing (double octave chord), fully vertical = single note.

import { OCTAVE } from './config';

export interface TiltSample {
  // Normalized tilt, each axis in [-1, 0]. 0 = phone flat.
  // x: roll toward vertical drives x to -1.
  // y: pitch toward the sky (camera up) drives y to -1.
  x: number;
  y: number;
}

export const FLAT_TILT: TiltSample = { x: 0, y: 0 };

// Nine oblique voicing levels: vertical = 0 steps (Unison), flat = 8 steps
// (Double Octave).
const MAX_INPUT_STEPS = 8;

// Four parallel levels (root through third inversion) on a 4-tone cycle.
export const MAX_PARALLEL_STEPS = 3;

// Cap matching mnc.py: never build a chain wider than the double octave
// chord.
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
 * Quantized parallel inversion level (0 = root position) from pitch tilt.
 */
export function parallelLevelFromTilt(tilt: TiltSample): number {
  const y = clamp(tilt.y, -1, 0);
  return Math.round(Math.abs(y) * MAX_PARALLEL_STEPS);
}

export const TILT_INVERSION_LEVEL_NAMES = [
  'Root Inv',
  '1st Inv',
  '2nd Inv',
  '3rd Inv',
] as const;

export const TILT_INVERSION_MAX_LABEL = (
  [...TILT_INVERSION_LEVEL_NAMES] as const
).reduce(
  (longest, label) => (label.length > longest.length ? label : longest),
  '' as (typeof TILT_INVERSION_LEVEL_NAMES)[number],
);

/**
 * Human-readable parallel inversion for the current pitch tilt.
 */
export function tiltInversionLevelName(tilt: TiltSample): string {
  const level = parallelLevelFromTilt(tilt);
  return TILT_INVERSION_LEVEL_NAMES[level] ?? 'Root Inv';
}

/**
 * Map a normalized tilt sample to integer ladder steps.
 *
 * Roll (x) is REVERSED: flat (x = 0) selects the widest oblique voicing,
 * fully vertical (x = -1) selects Unison. Pitch (y) selects the parallel
 * inversion: flat = root (0), full sky tilt = third inversion
 * (MAX_PARALLEL_STEPS).
 */
export function mapTiltToPositions(tilt: TiltSample): {
  inputSteps: number;
  parallelSteps: number;
} {
  const x = clamp(tilt.x, -1, 0);
  return {
    inputSteps: Math.round((x + 1) * MAX_INPUT_STEPS),
    parallelSteps: parallelLevelFromTilt(tilt),
  };
}

/** Default static voicing level index (8 = Double Octave). */
export const DEFAULT_STATIC_VOICING_LEVEL = MAX_INPUT_STEPS;

/** Default static inversion level index (0 = Root Inv). */
export const DEFAULT_STATIC_INVERSION_LEVEL = 0;

/**
 * Build a discrete tilt sample for static mode UI controls.
 */
export function tiltSampleFromLevels(
  inputSteps: number,
  parallelSteps: number
): TiltSample {
  const clampedInput = clamp(inputSteps, 0, MAX_INPUT_STEPS);
  const clampedParallel = clamp(parallelSteps, 0, MAX_PARALLEL_STEPS);
  const x = clampedInput / MAX_INPUT_STEPS - 1;
  const y =
    clampedParallel === 0 ? 0 : -(clampedParallel / MAX_PARALLEL_STEPS);
  return { x, y };
}

export const TILT_VOICING_LEVEL_NAMES = [
  'Unison',
  'Third',
  'Triad',
  'Close',
  'Octave',
  'Drop 2',
  'Drop 3',
  'Drop 2&4',
  'Double Octave',
] as const;

// Longest label shown in the TopBar voicing/tilt readout slot (sizes the box).
export const TILT_READOUT_MAX_LABEL = (
  [
    ...TILT_VOICING_LEVEL_NAMES,
    'No motion sensors',
    'Enable Motion',
    'Motion Denied',
  ] as const
).reduce(
  (longest, label) => (label.length > longest.length ? label : longest),
  '' as (typeof TILT_VOICING_LEVEL_NAMES)[number],
);

/**
 * Oblique chain width (1–9) implied by roll tilt. Pitch inversion does not
 * change width.
 */
export function voicingWidthFromTilt(tilt: TiltSample): number {
  const { inputSteps } = mapTiltToPositions(tilt);
  return clamp(inputSteps + 1, 1, MAX_CHAIN_WIDTH);
}

/**
 * Human-readable voicing level for the current tilt sample.
 */
export function tiltVoicingLevelName(tilt: TiltSample): string {
  const width = voicingWidthFromTilt(tilt);
  return TILT_VOICING_LEVEL_NAMES[width - 1] ?? 'Unison';
}

/**
 * Build a chain of cycle tones from bottomPosition upward and thin wide
 * chains to at most five voices.
 */
export function buildThinnedChain(
  bottomPosition: number,
  width: number,
  cycle: number[],
  baseMidi: number
): number[] {
  if (cycle.length === 0 || width <= 0) return [];

  const chainWidth = Math.min(width, MAX_CHAIN_WIDTH);
  const skips = THINNING_RULES[chainWidth] ?? [];

  const chord: number[] = [];
  for (let note = 1; note <= chainWidth; note++) {
    if (skips.includes(note)) continue;
    chord.push(ladderPitch(cycle, baseMidi, bottomPosition + (note - 1)));
  }
  return chord;
}

/**
 * Oblique motion: expand from a pivot anchor, alternating above and below
 * (width 2 adds above, width 3 adds below, and so on).
 */
export function obliqueMotion(
  pivotPosition: number,
  width: number,
  cycle: number[],
  baseMidi: number
): number[] {
  if (cycle.length === 0 || width <= 0) return [];
  if (width === 1) {
    return [ladderPitch(cycle, baseMidi, pivotPosition)];
  }

  const bottomPosition =
    pivotPosition - Math.floor((width - 1) / 2);
  return buildThinnedChain(bottomPosition, width, cycle, baseMidi);
}

/**
 * Compute the full tilt voicing for a chord.
 *
 * Parallel and oblique motion compose on the tone ladder: the pitch axis
 * sets the inversion (pivot position); roll selects the oblique chain width.
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

  const { parallelSteps } = mapTiltToPositions(tilt);
  const parallel = Math.min(parallelSteps, cycle.length - 1);
  const width = voicingWidthFromTilt(tilt);
  return obliqueMotion(parallel, width, cycle, homeMidi);
}
