// TiltVoicingEngine.ts
// Port of the tilt-to-counterpoint mechanic from "Movements, Not Chords"
// (Movements-Not-Chords/mnc.py). See docs/movements-not-chords-tilt.md.
//
// The engine voices a chord on a "tone cycle": the pitch classes of the
// post-borrowing chord, expressed as ascending semitone offsets from the
// chord root. One ladder step equals one chord tone. Rolling the phone
// expands the voicing in oblique motion from a pivot (alternating notes
// above and below); pitching the phone cycles parallel positions on the
// ladder (chest-ward raises the pivot, away-from-chest lowers it).
//
// The roll response is deliberately reversed from the Python original:
// flat = widest voicing (double octave chord), fully vertical = single note.

import { OCTAVE } from './config';

export interface TiltSample {
  // Normalized tilt. 0 = phone flat on each axis.
  // x: roll toward vertical drives x to -1 (range [-1, 0]).
  // y: chest-ward pitch drives y to -1; away-from-chest drives y to +1.
  x: number;
  y: number;
}

export const FLAT_TILT: TiltSample = { x: 0, y: 0 };

// Nine oblique voicing levels: vertical = 0 steps (Unison), flat = 8 steps
// (Double Octave).
const MAX_INPUT_STEPS = 8;

// Four named positions (1st through 4th) on a 4-tone cycle; static UI uses
// indices 0..MAX_PARALLEL_STEPS. Tilt pitch adds one extra ladder step each
// way so full tilt lands on 1st again (one cycle up or down).
export const MAX_PARALLEL_STEPS = 3;

/** Chest-ward / away-from-chest tilt steps at full pitch (±4 ladder steps). */
export const MAX_TILT_PITCH_STEPS = MAX_PARALLEL_STEPS + 1;

// Cap matching mnc.py: never build a chain wider than the double octave
// chord.
const MAX_CHAIN_WIDTH = 9;

// Thinning rules from mnc.py contraryMotion ("like how I play it on piano").
// Keyed by chain width; values are 1-indexed chain positions to skip.
// Width 5 (Octave) is left unthinned; thinning starts at width 6 (Drop 2).
const THINNING_RULES: Record<number, number[]> = {
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
 * Signed ladder pivot step from pitch tilt.
 * Chest-ward (y < 0): +1..+4; away-from-chest (y > 0): -1..-4; flat: 0.
 * ±4 is one full tone-cycle (octave register) from center 1st.
 *
 * Static UI only encodes chest-ward 0..3 via tiltSampleFromLevels; full ±4
 * range is available in live tilt mode only.
 */
export function parallelLevelFromTilt(tilt: TiltSample): number {
  const y = clamp(tilt.y, -1, 1);
  if (y === 0) return 0;
  if (y < 0) {
    return Math.round(Math.abs(y) * MAX_TILT_PITCH_STEPS);
  }
  const downSteps = Math.round(y * MAX_TILT_PITCH_STEPS);
  return downSteps === 0 ? 0 : -downSteps;
}

/** Map signed pivot steps to a 0-based position label index (1st..4th). */
export function positionLabelIndexFromParallelSteps(steps: number): number {
  const positionCount = MAX_PARALLEL_STEPS + 1;
  if (steps >= 0) {
    return steps % positionCount;
  }
  const abs = Math.abs(steps);
  if (abs >= positionCount) return 0;
  return MAX_PARALLEL_STEPS - abs + 1;
}

/**
 * Map a normalized tilt sample to integer ladder steps.
 *
 * Roll (x) is REVERSED: flat (x = 0) selects the widest oblique voicing,
 * fully vertical (x = -1) selects Unison. Pitch (y) selects the parallel
 * position: flat = 1st (0); chest-ward = 2nd..4th..1st (+1..+4); away-from-chest
 * = 4th..2nd..1st (-1..-4).
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

/** Default static voicing level index (5 = Drop 2). */
export const DEFAULT_STATIC_VOICING_LEVEL = 5;

/** Default static position level index (0 = 1st). */
export const DEFAULT_STATIC_POSITION_LEVEL = 0;

/**
 * Build a discrete tilt sample for static mode UI controls.
 *
 * Static position selects only chest-ward parallel levels 0..3 (1st through
 * 4th). Away-from-chest positions are tilt-only.
 */
export function tiltSampleFromLevels(
  inputSteps: number,
  parallelSteps: number
): TiltSample {
  const clampedInput = clamp(inputSteps, 0, MAX_INPUT_STEPS);
  const clampedParallel = clamp(parallelSteps, 0, MAX_PARALLEL_STEPS);
  const x = clampedInput / MAX_INPUT_STEPS - 1;
  const y =
    clampedParallel === 0
      ? 0
      : -(clampedParallel / MAX_TILT_PITCH_STEPS);
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

/** Longest voicing label on phone diagram overlays (sizes both top pills). */
export const TILT_VOICING_OVERLAY_MAX_LABEL = 'Double Oct.';

/** Overlay-friendly voicing names (abbreviated where needed). */
export const TILT_VOICING_OVERLAY_LABELS = TILT_VOICING_LEVEL_NAMES.map(
  (name) => (name === 'Double Octave' ? TILT_VOICING_OVERLAY_MAX_LABEL : name),
);

/**
 * Human-readable voicing level for diagram overlay readouts.
 */
export function tiltVoicingOverlayLabel(tilt: TiltSample): string {
  const width = voicingWidthFromTilt(tilt);
  const idx = width - 1;
  return TILT_VOICING_OVERLAY_LABELS[idx] ?? 'Unison';
}

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
 * Oblique chain width (1–9) implied by roll tilt. Pitch position does not
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
 * Build a symmetric voicing chain centered on the parallel pivot.
 *
 * Used for contrary roll voicing (width narrows from Double Oct. toward
 * Unison). Individual ladder steps may be oblique or contrary; stepping
 * through the ladder with the opposite element gives stepwise contrary motion.
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
 * How roll width is applied on the tone ladder.
 *
 * - contrary: bottom and top move in opposite directions as width narrows
 *   (Double Oct. down to Drop 3; Drop 2&4 is an oblique intermediary step).
 * - pivot: bottom stays on the parallel pivot; width only adds notes above
 *   (static mode position control).
 */
export type TiltVoicingAnchor = 'contrary' | 'pivot';

export interface ComputeTiltVoicingOptions {
  anchor?: TiltVoicingAnchor;
}

/**
 * Compute the full tilt voicing for a chord.
 *
 * Parallel and roll motion compose on the tone ladder: the pitch axis
 * sets the parallel pivot; roll selects chain width (contrary by default,
 * or pivot-anchored for static mode).
 *
 * pitchStructure: pre-voicing pitches from BorrowingLogic (4 slots, nulls
 * for voices toggled off). rootPitchClass: pitch class of the chord root.
 * octaveRange: the app's octave range setting, used to place the register.
 * tonalCenter: selected root/key pitch class; anchors home register so
 * elemental chords stay in a continuous register when roots wrap mod 12.
 * homeMidiOverride: when set, uses this pivot instead of the default formula
 * (used for elemental contrary-motion anchoring).
 */
export function computeTiltVoicing(
  pitchStructure: (number | null)[],
  rootPitchClass: number,
  tilt: TiltSample,
  octaveRange: number,
  tonalCenter: number,
  homeMidiOverride?: number,
  options?: ComputeTiltVoicingOptions
): number[] {
  const cycle = buildToneCycle(pitchStructure, rootPitchClass);
  if (cycle.length === 0) return [];

  const homeMidi =
    homeMidiOverride ??
    (tonalCenter +
      OCTAVE * (octaveRange + 2) +
      ((rootPitchClass - tonalCenter + OCTAVE) % OCTAVE));

  const { parallelSteps } = mapTiltToPositions(tilt);
  const maxPivot = cycle.length;
  const pivot = clamp(parallelSteps, -maxPivot, maxPivot);
  const width = voicingWidthFromTilt(tilt);
  const anchor = options?.anchor ?? 'contrary';
  if (anchor === 'pivot') {
    return buildThinnedChain(pivot, width, cycle, homeMidi);
  }
  return obliqueMotion(pivot, width, cycle, homeMidi);
}
