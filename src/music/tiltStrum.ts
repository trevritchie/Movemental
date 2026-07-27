/**
 * Tilt to Strum: discrete tilt-level note diffs without retapping.
 *
 * Rate-limits using BPM + Shortest Note and compares set membership only
 * (see AudioEngine.updateVoicingDiff; finished notes may re-attack on tilt).
 * Pitch-shifting slides are out of scope.
 */
import { clamp } from '../utils/clamp';
import type { ShortestNote } from '../settings/userSettingsSchema';
import {
  mapTiltToPositions,
  MAX_TILT_PITCH_STEPS,
  parallelLevelFromTilt,
  tiltSampleFromLevels,
  type TiltSample,
} from './TiltVoicingEngine';

export type StrumLevelPair = {
  inputSteps: number;
  parallelSteps: number;
};

/**
 * Minimum ms between strum audio updates from BPM and shortest-note division.
 */
export function strumMinIntervalMs(
  bpm: number,
  shortestNote: ShortestNote,
): number {
  const beats =
    shortestNote === '16n' ? 0.25 : shortestNote === '8n' ? 0.5 : 1;
  return (60_000 / bpm) * beats;
}

/**
 * True when the discrete tilt level pair differs from the last accepted
 * strum (or when no prior level has been recorded yet).
 */
export function strumLevelsChanged(
  next: StrumLevelPair,
  previous: StrumLevelPair | null,
): boolean {
  if (previous === null) return true;
  return (
    next.inputSteps !== previous.inputSteps ||
    next.parallelSteps !== previous.parallelSteps
  );
}

/**
 * True when enough time has elapsed since the last accepted strum.
 */
export function strumRateLimitAllows(
  nowMs: number,
  lastStrumMs: number,
  minIntervalMs: number,
): boolean {
  return nowMs - lastStrumMs >= minIntervalMs;
}

/**
 * Resolve continuous-strum playback tilt from live device tilt.
 *
 * Preserves the parallel established at the last commit and applies live roll
 * plus pitch delta since the last control (tap) tilt. Does not re-run
 * opposite-element diminished root search.
 */
export function resolveStrumPlaybackTilt(
  liveTilt: TiltSample,
  lastControlTilt: TiltSample,
  lastCommittedPlaybackTilt: TiltSample,
): TiltSample {
  const { inputSteps } = mapTiltToPositions(liveTilt);
  const pitchDelta =
    parallelLevelFromTilt(liveTilt) - parallelLevelFromTilt(lastControlTilt);
  const effectiveParallel = clamp(
    parallelLevelFromTilt(lastCommittedPlaybackTilt) + pitchDelta,
    -MAX_TILT_PITCH_STEPS,
    MAX_TILT_PITCH_STEPS,
  );
  return tiltSampleFromLevels(inputSteps, effectiveParallel);
}
