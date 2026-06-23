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

/** Total-cost tolerance for preferring upward semitone bass resolution. */
export const LEADING_TONE_COST_SLACK = 2;

export function bassDelta(
  previousBass: number,
  candidateBass: number
): number {
  return candidateBass - previousBass;
}

/** Higher is better. +1 leading tone beats common tone, then other motion. */
export function bassPreferenceScore(
  previousBass: number,
  candidateBass: number
): number {
  const delta = bassDelta(previousBass, candidateBass);
  if (delta === 1) {
    return 3;
  }
  if (delta === 0) {
    return 2;
  }
  return 1;
}

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

interface PivotEvaluation {
  pivot: number;
  cost: number;
  registerBreak: number;
  candidateBass: number;
  bassPref: number;
  bassDistance: number;
  pivotDistance: number;
}

function isBetterOverallCandidate(
  candidate: PivotEvaluation,
  best: PivotEvaluation
): boolean {
  if (candidate.cost < best.cost) {
    return true;
  }
  if (candidate.cost > best.cost) {
    return false;
  }
  if (candidate.registerBreak > best.registerBreak) {
    return true;
  }
  if (candidate.registerBreak < best.registerBreak) {
    return false;
  }
  if (candidate.bassPref > best.bassPref) {
    return true;
  }
  if (candidate.bassPref < best.bassPref) {
    return false;
  }
  if (candidate.bassDistance < best.bassDistance) {
    return true;
  }
  if (candidate.bassDistance > best.bassDistance) {
    return false;
  }
  if (candidate.pivotDistance < best.pivotDistance) {
    return true;
  }
  if (candidate.pivotDistance > best.pivotDistance) {
    return false;
  }
  return candidate.pivot < best.pivot;
}

function isBetterLeadingToneCandidate(
  candidate: PivotEvaluation,
  best: PivotEvaluation
): boolean {
  if (candidate.cost < best.cost) {
    return true;
  }
  if (candidate.cost > best.cost) {
    return false;
  }
  if (candidate.registerBreak > best.registerBreak) {
    return true;
  }
  if (candidate.registerBreak < best.registerBreak) {
    return false;
  }
  if (candidate.pivotDistance < best.pivotDistance) {
    return true;
  }
  if (candidate.pivotDistance > best.pivotDistance) {
    return false;
  }
  return candidate.pivot < best.pivot;
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
  const previousBass = Math.min(...previousPitches);

  const evaluated: PivotEvaluation[] = [];

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
    const candidateBass = Math.min(...candidate);
    evaluated.push({
      pivot,
      cost: score.cost,
      registerBreak: registerTieBreak(
        previousPitches,
        score,
        referenceMidi
      ),
      candidateBass,
      bassPref: bassPreferenceScore(previousBass, candidateBass),
      bassDistance: Math.abs(candidateBass - previousBass),
      pivotDistance: Math.abs(pivot - baselineParallel),
    });
  }

  if (evaluated.length === 0) {
    return clamp(baselineParallel, -maxPivot, maxPivot);
  }

  let bestOverall = evaluated[0];
  for (let i = 1; i < evaluated.length; i++) {
    if (isBetterOverallCandidate(evaluated[i], bestOverall)) {
      bestOverall = evaluated[i];
    }
  }

  const bestCost = bestOverall.cost;
  const slackLimit = bestCost + LEADING_TONE_COST_SLACK;
  let bestLeadingTone: PivotEvaluation | null = null;

  for (const candidate of evaluated) {
    if (bassDelta(previousBass, candidate.candidateBass) !== 1) {
      continue;
    }
    if (candidate.cost > slackLimit) {
      continue;
    }
    if (
      bestLeadingTone === null ||
      isBetterLeadingToneCandidate(candidate, bestLeadingTone)
    ) {
      bestLeadingTone = candidate;
    }
  }

  return (bestLeadingTone ?? bestOverall).pivot;
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
