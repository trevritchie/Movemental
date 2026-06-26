import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager, type Chord } from './ChordManager';
import { OCTAVE } from './config';
import { computeNeutralTiltVoicing } from './tiltVoicingPlayback';
import {
  computeEffectiveParallelSteps,
  resolveSmoothParallelSteps,
} from './smoothestVoiceLeading';
import {
  FLAT_TILT,
  buildThinnedChain,
  buildToneCycle,
  mapTiltToPositions,
  obliqueMotion,
  parallelLevelFromTilt,
  parallelStepsFromNoTiltPositionLevel,
  noTiltLevelsFromTilt,
  noTiltPositionLevelFromParallelSteps,
  tiltSampleFromLevels,
  voicingWidthFromTilt,
} from './TiltVoicingEngine';

const TONAL_CENTER_BB = 10;
const OCTAVE_RANGE = 2;
// Flat double-octave roll at parallel 0 (smooth mode starting tilt).
const DOUBLE_OCTAVE_FLAT = tiltSampleFromLevels(8, 0);
const PITCH_UP_TWO = tiltSampleFromLevels(8, 2);

function pitchClass(midi: number): number {
  return ((midi % OCTAVE) + OCTAVE) % OCTAVE;
}

function pitchStructureFrom(chord: Chord): number[] {
  return [chord.pitches[0], chord.pitches[1], chord.pitches[2], chord.pitches[3]];
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

    const pitchStructure = pitchStructureFrom(glass);
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
    const contraryHomeMidi =
      TONAL_CENTER_BB +
      OCTAVE * (OCTAVE_RANGE + 2) +
      ((rootPitchClass - TONAL_CENTER_BB + OCTAVE) % OCTAVE);
    const width = voicingWidthFromTilt(DOUBLE_OCTAVE_FLAT);
    const nextPitches = buildThinnedChain(
      smoothParallel,
      width,
      cycle,
      contraryHomeMidi - OCTAVE
    );

    expect(pitchClass(Math.min(...nextPitches))).toBe(TONAL_CENTER_BB);
    expect(Math.min(...nextPitches)).toBe(Math.min(...previousPitches));
  });

  it('returns baseline parallel when there is no previous voicing', () => {
    const glass = manager.getChordByName('Glass')!;
    const pitchStructure = pitchStructureFrom(glass);
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

    const pitchStructure = pitchStructureFrom(glass);
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

    const narrowTilt = tiltSampleFromLevels(5, 0);
    const narrowWidth = voicingWidthFromTilt(narrowTilt);
    const pivotNarrowBottom = Math.min(
      ...buildThinnedChain(
        pivotParallel,
        narrowWidth,
        cycle,
        homeMidi - OCTAVE
      )
    );
    const contraryNarrowBottom = Math.min(
      ...obliqueMotion(contraryParallel, narrowWidth, cycle, homeMidi)
    );
    expect(contraryNarrowBottom).not.toBe(pivotNarrowBottom);
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

    const pitchStructure = pitchStructureFrom(glass);
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

describe('noTiltLevelsFromTilt', () => {
  it('round-trips with tiltSampleFromLevels and no-tilt position indices', () => {
    const original = tiltSampleFromLevels(5, 2);
    const levels = noTiltLevelsFromTilt(original);

    expect(levels.voicingLevel).toBe(5);
    expect(levels.positionLevel).toBe(
      noTiltPositionLevelFromParallelSteps(2)
    );

    const roundTrip = tiltSampleFromLevels(
      levels.voicingLevel,
      parallelStepsFromNoTiltPositionLevel(levels.positionLevel)
    );
    expect(parallelLevelFromTilt(roundTrip)).toBe(
      parallelLevelFromTilt(original)
    );
    expect(mapTiltToPositions(roundTrip).inputSteps).toBe(
      mapTiltToPositions(original).inputSteps
    );
  });
});

describe('no-tilt smooth baseline sync', () => {
  it('second preserve pass is idempotent after baseline sync from playbackTilt', () => {
    const playbackTilt = tiltSampleFromLevels(5, 2);
    const smoothBase = parallelLevelFromTilt(playbackTilt);
    const { voicingLevel, positionLevel } = noTiltLevelsFromTilt(playbackTilt);
    const lastTapTilt = playbackTilt;
    const currentTilt = tiltSampleFromLevels(
      voicingLevel,
      parallelStepsFromNoTiltPositionLevel(positionLevel)
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
