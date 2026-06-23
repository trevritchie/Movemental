import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import { OCTAVE } from './config';
import { computeNeutralTiltVoicing } from './tiltVoicingPlayback';
import {
  bassDelta,
  bassPreferenceScore,
  computeEffectiveParallelSteps,
  LEADING_TONE_COST_SLACK,
  resolveSmoothParallelSteps,
} from './smoothVoiceLeading';
import {
  FLAT_TILT,
  buildThinnedChain,
  buildToneCycle,
  mapTiltToPositions,
  obliqueMotion,
  parallelLevelFromTilt,
  parallelStepsFromStaticPositionLevel,
  staticLevelsFromTilt,
  staticPositionLevelFromParallelSteps,
  tiltSampleFromLevels,
  voicingWidthFromTilt,
} from './TiltVoicingEngine';

const TONAL_CENTER_BB = 10;
const OCTAVE_RANGE = 2;
const DOUBLE_OCTAVE_FLAT = tiltSampleFromLevels(8, 0);
const PITCH_UP_TWO = tiltSampleFromLevels(8, 2);

function pitchClass(midi: number): number {
  return ((midi % OCTAVE) + OCTAVE) % OCTAVE;
}

describe('resolveSmoothParallelSteps', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER_BB);
    manager.setOctaveRange(OCTAVE_RANGE);
  });

  it('keeps Bb in the bass when moving from Bb maj6 to Eb maj6 at double octave', () => {
    const branch = manager.getChordByName('Branch')!;
    const glass = manager.getChordByName('Glass')!;

    const previousPitches = computeNeutralTiltVoicing(
      branch,
      DOUBLE_OCTAVE_FLAT,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      { anchor: 'pivot' }
    );

    expect(previousPitches.length).toBeGreaterThan(0);
    expect(pitchClass(Math.min(...previousPitches))).toBe(TONAL_CENTER_BB);

    const pitchStructure = [
      glass.pitches[0],
      glass.pitches[1],
      glass.pitches[2],
      glass.pitches[3],
    ];
    const rootPitchClass = glass.pitches[glass.rootPositionIndex] % OCTAVE;

    const smoothParallel = resolveSmoothParallelSteps(
      previousPitches,
      pitchStructure,
      rootPitchClass,
      DOUBLE_OCTAVE_FLAT,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      'pivot'
    );

    const cycle = buildToneCycle(pitchStructure, rootPitchClass);
    const homeMidi =
      TONAL_CENTER_BB +
      OCTAVE * (OCTAVE_RANGE + 2) +
      ((rootPitchClass - TONAL_CENTER_BB + OCTAVE) % OCTAVE);
    const width = voicingWidthFromTilt(DOUBLE_OCTAVE_FLAT);
    const nextPitches = buildThinnedChain(
      smoothParallel,
      width,
      cycle,
      homeMidi
    );

    expect(pitchClass(Math.min(...nextPitches))).toBe(TONAL_CENTER_BB);
    expect(Math.min(...nextPitches)).toBe(Math.min(...previousPitches));
  });

  it('returns baseline parallel when there is no previous voicing', () => {
    const glass = manager.getChordByName('Glass')!;
    const pitchStructure = [
      glass.pitches[0],
      glass.pitches[1],
      glass.pitches[2],
      glass.pitches[3],
    ];
    const rootPitchClass = glass.pitches[glass.rootPositionIndex] % OCTAVE;

    const smoothParallel = resolveSmoothParallelSteps(
      [],
      pitchStructure,
      rootPitchClass,
      DOUBLE_OCTAVE_FLAT,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      'pivot'
    );

    expect(smoothParallel).toBe(parallelLevelFromTilt(DOUBLE_OCTAVE_FLAT));
  });

  it('uses contrary anchor when requested', () => {
    const branch = manager.getChordByName('Branch')!;
    const glass = manager.getChordByName('Glass')!;

    const previousPitches = computeNeutralTiltVoicing(
      branch,
      DOUBLE_OCTAVE_FLAT,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      { anchor: 'contrary' }
    );

    const pitchStructure = [
      glass.pitches[0],
      glass.pitches[1],
      glass.pitches[2],
      glass.pitches[3],
    ];
    const rootPitchClass = glass.pitches[glass.rootPositionIndex] % OCTAVE;

    const pivotParallel = resolveSmoothParallelSteps(
      previousPitches,
      pitchStructure,
      rootPitchClass,
      DOUBLE_OCTAVE_FLAT,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      'pivot'
    );
    const contraryParallel = resolveSmoothParallelSteps(
      previousPitches,
      pitchStructure,
      rootPitchClass,
      DOUBLE_OCTAVE_FLAT,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      'contrary'
    );

    const cycle = buildToneCycle(pitchStructure, rootPitchClass);
    const homeMidi =
      TONAL_CENTER_BB +
      OCTAVE * (OCTAVE_RANGE + 2) +
      ((rootPitchClass - TONAL_CENTER_BB + OCTAVE) % OCTAVE);
    const width = voicingWidthFromTilt(DOUBLE_OCTAVE_FLAT);

    const pivotBottom = Math.min(
      ...buildThinnedChain(pivotParallel, width, cycle, homeMidi)
    );
    const contraryBottom = Math.min(
      ...obliqueMotion(contraryParallel, width, cycle, homeMidi)
    );

    expect(contraryBottom).not.toBe(pivotBottom);
  });
});

describe('computeEffectiveParallelSteps', () => {
  it('adds pitch delta since the last tap on top of smooth baseline', () => {
    const smoothBaseParallel = 2;
    const effective = computeEffectiveParallelSteps(
      smoothBaseParallel,
      FLAT_TILT,
      PITCH_UP_TWO
    );
    expect(effective).toBe(smoothBaseParallel + 2);
  });

  it('returns smooth baseline when live tilt matches last tap', () => {
    const smoothBaseParallel = 2;
    expect(
      computeEffectiveParallelSteps(smoothBaseParallel, FLAT_TILT, FLAT_TILT)
    ).toBe(2);
  });
});

describe('inter-tap roll change', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER_BB);
    manager.setOctaveRange(OCTAVE_RANGE);
  });

  it('searches at baseline width then applies current width at smooth parallel', () => {
    const branch = manager.getChordByName('Branch')!;
    const glass = manager.getChordByName('Glass')!;
    const baselineTilt = DOUBLE_OCTAVE_FLAT;
    const currentTilt = tiltSampleFromLevels(2, 0);

    const previousPitches = computeNeutralTiltVoicing(
      branch,
      baselineTilt,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      { anchor: 'pivot' }
    );

    const pitchStructure = [
      glass.pitches[0],
      glass.pitches[1],
      glass.pitches[2],
      glass.pitches[3],
    ];
    const rootPitchClass = glass.pitches[glass.rootPositionIndex] % OCTAVE;

    const smoothParallel = resolveSmoothParallelSteps(
      previousPitches,
      pitchStructure,
      rootPitchClass,
      baselineTilt,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      'pivot'
    );

    const { inputSteps: currentWidth } = mapTiltToPositions(currentTilt);
    const effectiveTilt = tiltSampleFromLevels(currentWidth, smoothParallel);
    const playbackPitches = computeNeutralTiltVoicing(
      glass,
      effectiveTilt,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      { anchor: 'pivot' }
    );

    expect(voicingWidthFromTilt(currentTilt)).toBe(3);
    expect(voicingWidthFromTilt(baselineTilt)).toBe(9);
    expect(playbackPitches.length).toBeLessThan(previousPitches.length);
    expect(pitchClass(Math.min(...playbackPitches))).toBe(TONAL_CENTER_BB);
  });
});

describe('staticLevelsFromTilt', () => {
  it('round-trips with tiltSampleFromLevels and static position indices', () => {
    const original = tiltSampleFromLevels(5, 2);
    const levels = staticLevelsFromTilt(original);

    expect(levels.voicingLevel).toBe(5);
    expect(levels.positionLevel).toBe(
      staticPositionLevelFromParallelSteps(2)
    );

    const roundTrip = tiltSampleFromLevels(
      levels.voicingLevel,
      parallelStepsFromStaticPositionLevel(levels.positionLevel)
    );
    expect(parallelLevelFromTilt(roundTrip)).toBe(
      parallelLevelFromTilt(original)
    );
    expect(mapTiltToPositions(roundTrip).inputSteps).toBe(
      mapTiltToPositions(original).inputSteps
    );
  });
});

describe('static smooth baseline sync', () => {
  it('second preserve pass is idempotent after baseline sync from playbackTilt', () => {
    const playbackTilt = tiltSampleFromLevels(5, 2);
    const smoothBase = parallelLevelFromTilt(playbackTilt);
    const { voicingLevel, positionLevel } = staticLevelsFromTilt(playbackTilt);
    const lastTapTilt = playbackTilt;
    const currentTilt = tiltSampleFromLevels(
      voicingLevel,
      parallelStepsFromStaticPositionLevel(positionLevel)
    );

    const parallelDelta =
      parallelLevelFromTilt(currentTilt) -
      parallelLevelFromTilt(lastTapTilt);
    const effectiveParallel = smoothBase + parallelDelta;

    expect(effectiveParallel).toBe(2);
  });
});

describe('pivot anchor voicing width change', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER_BB);
    manager.setOctaveRange(OCTAVE_RANGE);
  });

  it('keeps bass pitch when voicing width changes on the same chord', () => {
    const branch = manager.getChordByName('Branch')!;
    const drop2 = tiltSampleFromLevels(5, 0);
    const drop3 = tiltSampleFromLevels(6, 0);

    const drop2Pitches = computeNeutralTiltVoicing(
      branch,
      drop2,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      { anchor: 'pivot' }
    );
    const drop3Pitches = computeNeutralTiltVoicing(
      branch,
      drop3,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      { anchor: 'pivot' }
    );

    expect(Math.min(...drop3Pitches)).toBe(Math.min(...drop2Pitches));
  });
});

describe('bassPreferenceScore', () => {
  it('ranks upward semitone resolution above common tone and other motion', () => {
    const previousBass = 69;
    expect(bassPreferenceScore(previousBass, 70)).toBe(3);
    expect(bassPreferenceScore(previousBass, 69)).toBe(2);
    expect(bassPreferenceScore(previousBass, 67)).toBe(1);
    expect(bassPreferenceScore(previousBass, 70)).toBeGreaterThan(
      bassPreferenceScore(previousBass, 69)
    );
    expect(bassPreferenceScore(previousBass, 70)).toBeGreaterThan(
      bassPreferenceScore(previousBass, 67)
    );
    expect(bassDelta(previousBass, 70)).toBe(1);
  });
});

describe('leading tone bass preference', () => {
  const rootPitchClass = TONAL_CENTER_BB;
  const pitchStructure = [10, 2, 5, 7];
  const baselineTilt = tiltSampleFromLevels(5, 0);
  const homeMidi = TONAL_CENTER_BB + OCTAVE * (OCTAVE_RANGE + 2);

  /** Previous voicing with A in the bass (Drop 2 width). */
  const previousPitchesWithABass = [69, 73, 77, 80, 84];

  function pivotBass(
    pivot: number,
    anchor: 'pivot' | 'contrary'
  ): number {
    const cycle = buildToneCycle(pitchStructure, rootPitchClass);
    const width = voicingWidthFromTilt(baselineTilt);
    const voicing =
      anchor === 'pivot'
        ? buildThinnedChain(pivot, width, cycle, homeMidi)
        : obliqueMotion(pivot, width, cycle, homeMidi);
    return Math.min(...voicing);
  }

  it('prefers Bb bass over G bass when A resolves up by a semitone within slack', () => {
    expect(pivotBass(3, 'pivot')).toBe(67);
    expect(pivotBass(4, 'pivot')).toBe(70);
    expect(bassDelta(69, pivotBass(4, 'pivot'))).toBe(1);

    const smoothParallel = resolveSmoothParallelSteps(
      previousPitchesWithABass,
      pitchStructure,
      rootPitchClass,
      baselineTilt,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      'pivot'
    );

    expect(smoothParallel).toBe(4);
    expect(pivotBass(smoothParallel, 'pivot')).toBe(70);
  });

  it('applies leading-tone preference with contrary anchor', () => {
    const contraryBaseline = tiltSampleFromLevels(0, 0);
    const previousPitches = [69];
    const cycle = buildToneCycle(pitchStructure, rootPitchClass);

    const smoothParallel = resolveSmoothParallelSteps(
      previousPitches,
      pitchStructure,
      rootPitchClass,
      contraryBaseline,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      'contrary'
    );

    const voicing = obliqueMotion(smoothParallel, 1, cycle, homeMidi);
    expect(bassDelta(69, Math.min(...voicing))).toBe(1);
  });

  it('does not override when leading-tone option exceeds cost slack', () => {
    const tightPreviousPitches = [69, 70, 74, 77, 81];
    const smoothParallel = resolveSmoothParallelSteps(
      tightPreviousPitches,
      pitchStructure,
      rootPitchClass,
      baselineTilt,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      'pivot'
    );

    const cycle = buildToneCycle(pitchStructure, rootPitchClass);
    const width = voicingWidthFromTilt(baselineTilt);
    let bestCost = Infinity;
    let leadingTonePivot: number | null = null;

    for (let pivot = -4; pivot <= 4; pivot++) {
      const candidate = buildThinnedChain(pivot, width, cycle, homeMidi);
      if (candidate.length === 0) {
        continue;
      }
      let cost = 0;
      for (let i = 0; i < tightPreviousPitches.length; i++) {
        let bestDist = Infinity;
        for (const pitch of candidate) {
          bestDist = Math.min(bestDist, Math.abs(tightPreviousPitches[i] - pitch));
        }
        cost += bestDist;
      }
      if (cost < bestCost) {
        bestCost = cost;
      }
      if (bassDelta(69, Math.min(...candidate)) === 1) {
        leadingTonePivot = pivot;
      }
    }

    expect(leadingTonePivot).not.toBeNull();
    const leadingToneCandidate = buildThinnedChain(
      leadingTonePivot!,
      width,
      cycle,
      homeMidi
    );
    let leadingToneCost = 0;
    for (let i = 0; i < tightPreviousPitches.length; i++) {
      let bestDist = Infinity;
      for (const pitch of leadingToneCandidate) {
        bestDist = Math.min(bestDist, Math.abs(tightPreviousPitches[i] - pitch));
      }
      leadingToneCost += bestDist;
    }

    if (leadingToneCost > bestCost + LEADING_TONE_COST_SLACK) {
      expect(bassDelta(69, pivotBass(smoothParallel, 'pivot'))).not.toBe(1);
    }
  });
});
