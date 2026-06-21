import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import { OCTAVE } from './config';
import { computeNeutralTiltVoicing } from './tiltVoicingPlayback';
import {
  computeEffectiveParallelSteps,
  resolveSmoothParallelSteps,
} from './smoothVoiceLeading';
import {
  FLAT_TILT,
  buildThinnedChain,
  buildToneCycle,
  mapTiltToPositions,
  obliqueMotion,
  parallelLevelFromTilt,
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
