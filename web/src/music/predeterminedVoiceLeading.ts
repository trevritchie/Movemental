/**
 * Per-chord flat parallel baselines for Smooth voice leading mode.
 *
 * Smooth mode is root position with a different default ladder step per chord:
 * `resolvePlaybackTiltWithFlatBaseline(CHORD_FLAT_PARALLEL[chord], liveTilt)`.
 * Live roll and pitch behave the same as root position; only the flat-pitch
 * resting point differs.
 *
 * Smoothest mode uses the heuristic in smoothestVoiceLeading.ts instead. This
 * table seeds Smooth defaults (see web/docs/smoothest-flat-parallel-from-branch.md).
 */
import {
  parallelLevelFromTilt,
  resolvePlaybackTiltWithFlatBaseline,
  tiltSampleFromLevels,
  type TiltSample,
} from './TiltVoicingEngine';

/**
 * Parallel ladder steps at flat tilt per chord name.
 * Generated from Smoothest: Branch (flat double octave) then target chord.
 */
export const CHORD_FLAT_PARALLEL: Record<string, number> = {
  // Elemental diminished (triangle corners)
  'Earth': -2,
  'Wind': -2,
  'Fire': 0,

  // Earth-Wind — Trunk (min6)
  'Trunk': 0,
  'Sister Trunk': -3,
  'Twin Trunk': -2,
  'Brother Trunk': -1,

  // Earth-Wind — Branch (maj6)
  'Branch': 0,
  'Sister Branch': -3,
  'Twin Branch': -2,
  'Brother Branch': -1,

  // Earth-Wind — Sand-Storm (7b5)
  'Sand-Storm': 0,
  'Sister Sand-Storm': -3,
  'Twin Sand-Storm': -2,
  'Brother Sand-Storm': -1,

  // Earth-Wind — Leaf (7)
  'Leaf': 0,
  'Sister Leaf': -3,
  'Twin Leaf': -2,
  'Brother Leaf': -1,

  // Wind-Fire — Smoke (min6)
  'Smoke': -2,
  'Sister Smoke': -1,
  'Twin Smoke': 0,
  'Brother Smoke': -3,

  // Wind-Fire — Ember (maj6)
  'Ember': -2,
  'Sister Ember': -1,
  'Twin Ember': 0,
  'Brother Ember': -3,

  // Wind-Fire — Fire-Storm (7b5)
  'Fire-Storm': -2,
  'Sister Fire-Storm': -1,
  'Twin Fire-Storm': 0,
  'Brother Fire-Storm': -3,

  // Wind-Fire — Flame (7)
  'Flame': -2,
  'Sister Flame': -1,
  'Twin Flame': 0,
  'Brother Flame': -3,

  // Fire-Earth — Magma (min6)
  'Magma': -1,
  'Sister Magma': -4,
  'Twin Magma': -3,
  'Brother Magma': -2,

  // Fire-Earth — Glass (maj6)
  'Glass': -2,
  'Sister Glass': -1,
  'Twin Glass': -4,
  'Brother Glass': -3,

  // Fire-Earth — Forest-Fire (7b5)
  'Forest-Fire': -2,
  'Sister Forest-Fire': -1,
  'Twin Forest-Fire': -4,
  'Brother Forest-Fire': -3,

  // Fire-Earth — Charcoal (7)
  'Charcoal': -2,
  'Sister Charcoal': -1,
  'Twin Charcoal': -4,
  'Brother Charcoal': -3,
};

/**
 * Signed parallel ladder steps for a chord at flat tilt (pitch axis = 0).
 */
export function getFlatParallelStepsForChord(chordName: string): number {
  const steps = CHORD_FLAT_PARALLEL[chordName];
  if (steps === undefined) {
    throw new Error(`No flat parallel mapping for chord: ${chordName}`);
  }
  return steps;
}

/** Flat baseline lookup (alias for table access and tests). */
export function resolvePredeterminedParallelSteps(chordName: string): number {
  return getFlatParallelStepsForChord(chordName);
}

/** Parallel ladder steps for Smooth mode at the given live tilt. */
export function resolveSmoothModeParallelSteps(
  chordName: string,
  liveTilt: TiltSample
): number {
  return parallelLevelFromTilt(
    resolveSmoothPlaybackTilt(chordName, liveTilt)
  );
}

/** Smooth mode playback tilt: per-chord flat baseline + live pitch/roll. */
export function resolveSmoothPlaybackTilt(
  chordName: string,
  liveTilt: TiltSample
): TiltSample {
  return resolvePlaybackTiltWithFlatBaseline(
    getFlatParallelStepsForChord(chordName),
    liveTilt
  );
}

/** Smooth no-tilt: predetermined parallel at flat + current voicing width only. */
export function resolveSmoothNoTiltPlaybackTilt(
  chordName: string,
  voicingLevel: number
): TiltSample {
  return tiltSampleFromLevels(
    voicingLevel,
    getFlatParallelStepsForChord(chordName)
  );
}
