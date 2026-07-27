/**
 * Tilt to Strum: discrete tilt-level note diffs without retapping.
 *
 * Rate-limits using BPM + Shortest Note and compares set membership only
 * (see AudioEngine.updateVoicingDiff; finished notes may re-attack on tilt).
 * Pitch-shifting slides are out of scope.
 */
import { clamp } from '../utils/clamp';
import type { ShortestNote } from '../settings/userSettingsSchema';
import type { VoicingElevatorFloorsMode } from './sessionModes';
import {
  mapTiltToPositions,
  MAX_TILT_PITCH_STEPS,
  parallelLevelFromTilt,
  tiltSampleFromLevels,
  type TiltSample,
} from './TiltVoicingEngine';
import { applyElevatorFloorsToTilt } from './voicingElevatorFloors';

export type StrumLevelPair = {
  inputSteps: number;
  parallelSteps: number;
};

/** Beats per Shortest Note value (compile-fails if the union grows). */
const SHORTEST_NOTE_BEATS: Record<ShortestNote, number> = {
  '16n': 0.25,
  '8n': 0.5,
  '4n': 1,
};

/**
 * Minimum ms between strum audio updates from BPM and shortest-note division.
 */
export function strumMinIntervalMs(
  bpm: number,
  shortestNote: ShortestNote,
): number {
  return (60_000 / bpm) * SHORTEST_NOTE_BEATS[shortestNote];
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
 * Snap live tilt onto the elevator floors ladder and return discrete levels.
 * Callers that both gate and resolve should reuse this snap once.
 */
export function strumSnapFromTilt(
  liveTilt: TiltSample,
  floorsMode: VoicingElevatorFloorsMode,
  chordName: string | null | undefined,
): { levels: StrumLevelPair; snapped: TiltSample } {
  const snapped = applyElevatorFloorsToTilt(liveTilt, floorsMode, chordName);
  return { levels: mapTiltToPositions(snapped), snapped };
}

/**
 * Resolve continuous-strum playback tilt from live device tilt.
 *
 * Applies Voicing Elevator Floors remapping to roll, preserves the parallel
 * established at the last commit, and applies pitch delta since the last
 * control sample. Does not re-run opposite-element diminished root search.
 * Pass `snappedLive` when the caller already snapped for gating.
 */
export function resolveStrumPlaybackTilt(
  liveTilt: TiltSample,
  lastControlTilt: TiltSample,
  lastCommittedPlaybackTilt: TiltSample,
  floorsMode: VoicingElevatorFloorsMode = 'all',
  chordName: string | null | undefined = null,
  snappedLive?: TiltSample,
): TiltSample {
  const snapped =
    snappedLive ??
    applyElevatorFloorsToTilt(liveTilt, floorsMode, chordName);
  const { inputSteps } = mapTiltToPositions(snapped);
  const pitchDelta =
    parallelLevelFromTilt(liveTilt) - parallelLevelFromTilt(lastControlTilt);
  const effectiveParallel = clamp(
    parallelLevelFromTilt(lastCommittedPlaybackTilt) + pitchDelta,
    -MAX_TILT_PITCH_STEPS,
    MAX_TILT_PITCH_STEPS,
  );
  return tiltSampleFromLevels(inputSteps, effectiveParallel);
}

/**
 * Discrete roll/pitch levels for strum gating after elevator-floor remapping.
 */
export function strumLevelsFromTilt(
  liveTilt: TiltSample,
  floorsMode: VoicingElevatorFloorsMode,
  chordName: string | null | undefined,
): StrumLevelPair {
  return strumSnapFromTilt(liveTilt, floorsMode, chordName).levels;
}
