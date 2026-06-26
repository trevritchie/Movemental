/**
 * Offline generator for Smoothest flat-parallel baselines from Branch.
 * See web/docs/smoothest-flat-parallel-from-branch.md; table values land in
 * predeterminedVoiceLeading.ts, not here at runtime.
 */

import type { ChordManager } from './ChordManager';
import {
  DEFAULT_OCTAVE_RANGE,
  DEFAULT_TONAL_CENTER_OFFSET,
} from './config';
import { BASE_GROUPS, SLICE_VARIANTS } from './diagramMetadata';
import { ELEMENTAL_NAMES } from './elementalRoot';
import { resolveSmoothParallelSteps } from './smoothestVoiceLeading';
import { tiltSampleFromLevels } from './TiltVoicingEngine';
import {
  computeNeutralTiltVoicing,
  resolveVoicingRoot,
} from './tiltVoicingPlayback';

export const BRANCH_SMOOTHEST_BASELINE_TILT = tiltSampleFromLevels(8, 0);

export function allChordNames(): string[] {
  const edge = BASE_GROUPS.flatMap((group) =>
    SLICE_VARIANTS.map((v) => `${v.prefix}${group}`)
  );
  return [...ELEMENTAL_NAMES, ...edge];
}

export function computeSmoothestParallelFromBranch(
  manager: ChordManager,
  targetChordName: string,
  tonalCenter: number = DEFAULT_TONAL_CENTER_OFFSET,
  octaveRange: number = DEFAULT_OCTAVE_RANGE
): number {
  const branch = manager.getChordByName('Branch');
  const target = manager.getChordByName(targetChordName);
  if (!branch || !target) {
    throw new Error(`Unknown chord: ${targetChordName}`);
  }

  const previousPitches = computeNeutralTiltVoicing(
    branch,
    BRANCH_SMOOTHEST_BASELINE_TILT,
    tonalCenter,
    octaveRange,
    { anchor: 'contrary', previousChord: null }
  );

  const { rootPitchClass, homeMidi, pitchStructure } = resolveVoicingRoot(
    target,
    tonalCenter,
    octaveRange
  );

  return resolveSmoothParallelSteps(
    previousPitches,
    pitchStructure,
    rootPitchClass,
    BRANCH_SMOOTHEST_BASELINE_TILT,
    tonalCenter,
    octaveRange,
    'contrary',
    homeMidi
  );
}

/** Parallel steps Smoothest picks after flat double-octave Branch. */
export function buildSmoothestParallelFromBranchTable(
  manager: ChordManager,
  tonalCenter: number = DEFAULT_TONAL_CENTER_OFFSET,
  octaveRange: number = DEFAULT_OCTAVE_RANGE
): Record<string, number> {
  const table: Record<string, number> = {};
  for (const name of allChordNames()) {
    table[name] = computeSmoothestParallelFromBranch(
      manager,
      name,
      tonalCenter,
      octaveRange
    );
  }
  return table;
}
