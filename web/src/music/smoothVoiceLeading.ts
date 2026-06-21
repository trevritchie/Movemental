/**
 * Smooth voice leading: pick parallel ladder steps on chord change that
 * minimize total semitone motion from the previous neutral voicing.
 */
import { OCTAVE } from './config';
import {
  buildThinnedChain,
  buildToneCycle,
  MAX_TILT_PITCH_STEPS,
  obliqueMotion,
  parallelLevelFromTilt,
  voicingWidthFromTilt,
  type TiltSample,
  type TiltVoicingAnchor,
} from './TiltVoicingEngine';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function computeHomeMidi(
  tonalCenter: number,
  octaveRange: number,
  rootPitchClass: number,
  homeMidiOverride?: number
): number {
  if (homeMidiOverride !== undefined) {
    return homeMidiOverride;
  }
  return (
    tonalCenter +
    OCTAVE * (octaveRange + 2) +
    ((rootPitchClass - tonalCenter + OCTAVE) % OCTAVE)
  );
}

function registerReferenceMidi(
  tonalCenter: number,
  octaveRange: number
): number {
  return tonalCenter + OCTAVE * (octaveRange + 2);
}

function permute<T>(items: T[]): T[][] {
  if (items.length <= 1) {
    return [items.slice()];
  }
  const result: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const head = items[i];
    const tail = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const rest of permute(tail)) {
      result.push([head, ...rest]);
    }
  }
  return result;
}

interface AssignmentScore {
  cost: number;
  downMoves: number;
  upMoves: number;
  assignment: number[];
}

function scoreAssignment(
  previousPitches: number[],
  candidatePitches: number[]
): AssignmentScore {
  if (previousPitches.length === 0) {
    return { cost: 0, downMoves: 0, upMoves: 0, assignment: [] };
  }

  if (previousPitches.length !== candidatePitches.length) {
    const assignment = previousPitches.map((pitch) => {
      let best = candidatePitches[0];
      let bestDist = Math.abs(pitch - best);
      for (let i = 1; i < candidatePitches.length; i++) {
        const dist = Math.abs(pitch - candidatePitches[i]);
        if (dist < bestDist) {
          bestDist = dist;
          best = candidatePitches[i];
        }
      }
      return best;
    });
    return summarizeAssignment(previousPitches, assignment);
  }

  let best: AssignmentScore | null = null;
  for (const perm of permute(candidatePitches)) {
    const candidateScore = summarizeAssignment(previousPitches, perm);
    if (
      best === null ||
      candidateScore.cost < best.cost ||
      (candidateScore.cost === best.cost &&
        compareTieBreak(candidateScore, best) > 0)
    ) {
      best = candidateScore;
    }
  }
  return best ?? { cost: 0, downMoves: 0, upMoves: 0, assignment: [] };
}

function summarizeAssignment(
  previousPitches: number[],
  assigned: number[]
): AssignmentScore {
  let cost = 0;
  let downMoves = 0;
  let upMoves = 0;
  for (let i = 0; i < previousPitches.length; i++) {
    const delta = assigned[i] - previousPitches[i];
    cost += Math.abs(delta);
    if (delta < 0) {
      downMoves++;
    } else if (delta > 0) {
      upMoves++;
    }
  }
  return { cost, downMoves, upMoves, assignment: assigned };
}

function compareTieBreak(a: AssignmentScore, b: AssignmentScore): number {
  if (a.downMoves !== b.downMoves) {
    return a.downMoves - b.downMoves;
  }
  if (a.upMoves !== b.upMoves) {
    return a.upMoves - b.upMoves;
  }
  return 0;
}

function registerTieBreak(
  previousPitches: number[],
  score: AssignmentScore,
  referenceMidi: number
): number {
  const aboveCount = previousPitches.filter((p) => p > referenceMidi).length;
  const belowCount = previousPitches.filter((p) => p < referenceMidi).length;
  if (aboveCount > belowCount) {
    return score.downMoves - score.upMoves;
  }
  if (belowCount > aboveCount) {
    return score.upMoves - score.downMoves;
  }
  return score.downMoves - score.upMoves;
}

function buildCandidateVoicing(
  pivot: number,
  width: number,
  cycle: number[],
  homeMidi: number,
  anchor: TiltVoicingAnchor
): number[] {
  if (anchor === 'pivot') {
    return buildThinnedChain(pivot, width, cycle, homeMidi);
  }
  return obliqueMotion(pivot, width, cycle, homeMidi);
}

/**
 * Find parallel ladder steps that yield the nearest voicing to previousPitches.
 *
 * Search width comes from baselineTilt (previous tap). Caller applies pitch
 * delta from currentTilt separately.
 */
export function resolveSmoothParallelSteps(
  previousPitches: number[],
  pitchStructure: (number | null)[],
  rootPitchClass: number,
  baselineTilt: TiltSample,
  tonalCenter: number,
  octaveRange: number,
  anchor: TiltVoicingAnchor,
  homeMidiOverride?: number
): number {
  if (previousPitches.length === 0) {
    return parallelLevelFromTilt(baselineTilt);
  }

  const cycle = buildToneCycle(pitchStructure, rootPitchClass);
  if (cycle.length === 0) {
    return parallelLevelFromTilt(baselineTilt);
  }

  const homeMidi = computeHomeMidi(
    tonalCenter,
    octaveRange,
    rootPitchClass,
    homeMidiOverride
  );
  const width = voicingWidthFromTilt(baselineTilt);
  const referenceMidi = registerReferenceMidi(tonalCenter, octaveRange);
  const baselineParallel = parallelLevelFromTilt(baselineTilt);
  const maxPivot = cycle.length;

  let bestPivot = clamp(baselineParallel, -maxPivot, maxPivot);
  let bestCost = Infinity;
  let bestRegisterBreak = -Infinity;
  let bestBassDistance = Infinity;

  const previousBass =
    previousPitches.length > 0 ? Math.min(...previousPitches) : 0;

  for (let pivot = -maxPivot; pivot <= maxPivot; pivot++) {
    const candidate = buildCandidateVoicing(
      pivot,
      width,
      cycle,
      homeMidi,
      anchor
    );
    if (candidate.length === 0) {
      continue;
    }

    const score = scoreAssignment(previousPitches, candidate);
    const registerBreak = registerTieBreak(
      previousPitches,
      score,
      referenceMidi
    );
    const bassDistance = Math.abs(
      Math.min(...candidate) - previousBass
    );

    const pivotDistance = Math.abs(pivot - baselineParallel);
    const bestPivotDistance = Math.abs(bestPivot - baselineParallel);

    if (
      score.cost < bestCost ||
      (score.cost === bestCost && registerBreak > bestRegisterBreak) ||
      (score.cost === bestCost &&
        registerBreak === bestRegisterBreak &&
        bassDistance < bestBassDistance) ||
      (score.cost === bestCost &&
        registerBreak === bestRegisterBreak &&
        bassDistance === bestBassDistance &&
        pivotDistance < bestPivotDistance) ||
      (score.cost === bestCost &&
        registerBreak === bestRegisterBreak &&
        bassDistance === bestBassDistance &&
        pivotDistance === bestPivotDistance &&
        pivot < bestPivot)
    ) {
      bestCost = score.cost;
      bestRegisterBreak = registerBreak;
      bestBassDistance = bassDistance;
      bestPivot = pivot;
    }
  }

  return bestPivot;
}

/**
 * Combine smooth baseline parallel steps with live pitch delta since last tap.
 */
export function computeEffectiveParallelSteps(
  smoothBaseParallel: number,
  lastTapTilt: TiltSample,
  liveTilt: TiltSample
): number {
  const delta =
    parallelLevelFromTilt(liveTilt) - parallelLevelFromTilt(lastTapTilt);
  return clamp(
    smoothBaseParallel + delta,
    -MAX_TILT_PITCH_STEPS,
    MAX_TILT_PITCH_STEPS
  );
}
