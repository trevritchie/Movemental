/**
 * Voicing Elevator Floors: All nine roll stops, or Every Other (five stops).
 *
 * Every Other splits the ladder for contrary on/off practice:
 * - Child (on) chords: Unison, Triad, Octave, Drop 3, Double Octave
 * - Parent Earth/Wind/Fire (off): Third, Close, Drop 2, Drop 2&4, Drop 2&4
 *
 * Parents duplicate Drop 2&4 on the top two stops so both families share
 * five physical tilt levels. The no-tilt dropdown lists Drop 2&4 once.
 */
import { PARENT_ELEMENT_NAMES } from './elementTokens';
import type { VoicingElevatorFloorsMode } from './sessionModes';
import {
  mapTiltToPositions,
  tiltSampleFromLevels,
  type TiltSample,
} from './TiltVoicingEngine';
import { clamp } from '../utils/clamp';

/** Absolute inputSteps for child chords under Every Other (5 stops). */
export const EVERY_OTHER_CHILD_INPUT_STEPS = [0, 2, 4, 6, 8] as const;

/**
 * Absolute inputSteps for Earth/Wind/Fire under Every Other (5 stops).
 * The last two stops both map to Drop 2&4 (inputSteps 7).
 */
export const EVERY_OTHER_PARENT_INPUT_STEPS = [1, 3, 5, 7, 7] as const;

const EVERY_OTHER_STOP_COUNT = EVERY_OTHER_CHILD_INPUT_STEPS.length;
const MAX_EVERY_OTHER_STOP_INDEX = EVERY_OTHER_STOP_COUNT - 1;

const ALL_VOICING_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

/** Dropdown levels for parents (Drop 2&4 once). */
export const EVERY_OTHER_PARENT_DROPDOWN_LEVELS = [1, 3, 5, 7] as const;

const PARENT_NAME_SET: ReadonlySet<string> = new Set(PARENT_ELEMENT_NAMES);

export function isParentElementChord(
  chordName: string | null | undefined,
): boolean {
  return chordName != null && PARENT_NAME_SET.has(chordName);
}

/**
 * Allowed absolute voicing level indices for the no-tilt dropdown.
 */
export function allowedVoicingLevels(
  mode: VoicingElevatorFloorsMode,
  chordName: string | null | undefined,
): readonly number[] {
  if (mode === 'all') {
    return ALL_VOICING_LEVELS;
  }
  return isParentElementChord(chordName)
    ? EVERY_OTHER_PARENT_DROPDOWN_LEVELS
    : EVERY_OTHER_CHILD_INPUT_STEPS;
}

/** Nearest allowed absolute voicing level (ties prefer the lower index). */
export function snapVoicingLevelToAllowed(
  level: number,
  allowed: readonly number[],
): number {
  if (allowed.length === 0) {
    return level;
  }
  if (allowed.includes(level)) {
    return level;
  }
  let best = allowed[0]!;
  let bestDist = Math.abs(level - best);
  for (let i = 1; i < allowed.length; i++) {
    const candidate = allowed[i]!;
    const dist = Math.abs(level - candidate);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Quantize continuous roll x in [-1, 0] to an Every Other stop index 0..4.
 */
export function everyOtherStopIndexFromRoll(tiltX: number): number {
  const x = clamp(tiltX, -1, 0);
  return Math.round((x + 1) * MAX_EVERY_OTHER_STOP_INDEX);
}

/**
 * Absolute inputSteps for a continuous roll under Every Other.
 */
export function everyOtherInputStepsFromRoll(
  tiltX: number,
  chordName: string | null | undefined,
): number {
  const stopIndex = clamp(
    everyOtherStopIndexFromRoll(tiltX),
    0,
    MAX_EVERY_OTHER_STOP_INDEX,
  );
  const table = isParentElementChord(chordName)
    ? EVERY_OTHER_PARENT_INPUT_STEPS
    : EVERY_OTHER_CHILD_INPUT_STEPS;
  return table[stopIndex]!;
}

/**
 * Snap a live device tilt sample onto the elevator floors ladder.
 *
 * No-tilt samples built from absolute dropdown levels must not pass through
 * this helper (odd parent floors are not invertible via x = steps/8 - 1).
 */
export function applyElevatorFloorsToTilt(
  tilt: TiltSample,
  mode: VoicingElevatorFloorsMode,
  chordName: string | null | undefined,
): TiltSample {
  if (mode === 'all') {
    return tilt;
  }
  const inputSteps = everyOtherInputStepsFromRoll(tilt.x, chordName);
  const { parallelSteps } = mapTiltToPositions(tilt);
  return tiltSampleFromLevels(inputSteps, parallelSteps);
}
