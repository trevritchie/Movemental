import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager, type Chord } from './ChordManager';
import {
  DEFAULT_OCTAVE_RANGE,
  DEFAULT_TONAL_CENTER_OFFSET,
  OCTAVE,
} from './config';
import { allChordNames, buildSmoothestParallelFromBranchTable } from './smoothestParallelFromBranch';
import { computeNeutralTiltVoicing } from './tiltVoicingPlayback';
import {
  CHORD_FLAT_PARALLEL,
  getFlatParallelStepsForChord,
  resolvePredeterminedParallelSteps,
} from './predeterminedVoiceLeading';
import { resolveSmoothParallelSteps } from './smoothestVoiceLeading';
import { tiltSampleFromLevels } from './TiltVoicingEngine';
import {
  getVoiceDegreeLabel,
  voiceLineForParallelSteps,
} from './voiceDegreeLabel';

const DOUBLE_OCTAVE_FLAT = tiltSampleFromLevels(8, 0);
const TONAL_CENTER_BB = 10;
const OCTAVE_RANGE = 2;

function pitchStructureFrom(chord: Chord): number[] {
  return [chord.pitches[0], chord.pitches[1], chord.pitches[2], chord.pitches[3]];
}

describe('CHORD_FLAT_PARALLEL', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(DEFAULT_TONAL_CENTER_OFFSET);
    manager.setOctaveRange(DEFAULT_OCTAVE_RANGE);
  });

  it('matches Smoothest from flat double-octave Branch for every chord', () => {
    const expected = buildSmoothestParallelFromBranchTable(manager);
    for (const name of allChordNames()) {
      if (name === 'Wind') {
        expect(getFlatParallelStepsForChord(name)).toBe(-2);
        expect(CHORD_FLAT_PARALLEL[name]).toBe(-2);
        continue;
      }
      expect(getFlatParallelStepsForChord(name)).toBe(expected[name]);
      expect(CHORD_FLAT_PARALLEL[name]).toBe(expected[name]);
    }
  });

  it('assigns Branch, Fire, and Magma per Smoothest-from-Branch', () => {
    expect(getFlatParallelStepsForChord('Branch')).toBe(0);
    expect(getFlatParallelStepsForChord('Fire')).toBe(0);
    expect(getFlatParallelStepsForChord('Magma')).toBe(-1);
  });

  it('resolvePredeterminedParallelSteps matches getFlatParallelStepsForChord', () => {
    expect(resolvePredeterminedParallelSteps('Glass')).toBe(
      getFlatParallelStepsForChord('Glass')
    );
  });
});

describe('Smooth mode bass stability Branch -> Fire -> Magma -> Fire', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER_BB);
    manager.setOctaveRange(OCTAVE_RANGE);
  });

  function bassDegreeLabel(chordName: string, parallelSteps: number): string {
    const chord = manager.getChordByName(chordName)!;
    const voiceLine = voiceLineForParallelSteps(parallelSteps);
    return getVoiceDegreeLabel(voiceLine, chord);
  }

  it('predetermined parallels match Smoothest-from-Branch bass degrees at flat', () => {
    expect(bassDegreeLabel('Branch', getFlatParallelStepsForChord('Branch'))).toBe(
      'Root'
    );
    expect(bassDegreeLabel('Fire', getFlatParallelStepsForChord('Fire'))).toBe(
      'Root'
    );
    expect(bassDegreeLabel('Magma', getFlatParallelStepsForChord('Magma'))).toBe(
      '6th'
    );
  });

  it('revisiting Fire restores the same flat parallel as the first visit', () => {
    const branch = manager.getChordByName('Branch')!;
    const fire = manager.getChordByName('Fire')!;
    const magma = manager.getChordByName('Magma')!;

    const fireParallel = resolvePredeterminedParallelSteps('Fire');
    const magmaParallel = resolvePredeterminedParallelSteps('Magma');
    const fireParallelAgain = resolvePredeterminedParallelSteps('Fire');

    expect(fireParallel).toBe(fireParallelAgain);
    expect(fireParallel).toBe(0);
    expect(magmaParallel).toBe(-1);

    const fireTilt = tiltSampleFromLevels(8, fireParallel);
    const magmaTilt = tiltSampleFromLevels(8, magmaParallel);
    const fireTiltAgain = tiltSampleFromLevels(8, fireParallelAgain);

    const fireVoicing = computeNeutralTiltVoicing(
      fire,
      fireTilt,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      { anchor: 'contrary', previousChord: branch }
    );
    const magmaVoicing = computeNeutralTiltVoicing(
      magma,
      magmaTilt,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      { anchor: 'contrary', previousChord: fire }
    );
    const fireVoicingAgain = computeNeutralTiltVoicing(
      fire,
      fireTiltAgain,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      { anchor: 'contrary', previousChord: magma }
    );

    expect(fireVoicing.length).toBeGreaterThan(0);
    expect(magmaVoicing.length).toBeGreaterThan(0);
    expect(fireVoicingAgain.length).toBeGreaterThan(0);

    const fireBassPc =
      ((Math.min(...fireVoicing) % OCTAVE) + OCTAVE) % OCTAVE;
    const fireAgainBassPc =
      ((Math.min(...fireVoicingAgain) % OCTAVE) + OCTAVE) % OCTAVE;
    expect(fireAgainBassPc).toBe(fireBassPc);
  });

  it('smoothest after Magma can differ from predetermined Fire on revisit', () => {
    const branch = manager.getChordByName('Branch')!;
    const fire = manager.getChordByName('Fire')!;
    const magma = manager.getChordByName('Magma')!;

    const branchVoicing = computeNeutralTiltVoicing(
      branch,
      DOUBLE_OCTAVE_FLAT,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      { anchor: 'contrary' }
    );

    const firePitchStructure = pitchStructureFrom(fire);
    const fireRootPc = fire.pitches[fire.rootPositionIndex] % OCTAVE;

    const fireTilt = tiltSampleFromLevels(
      8,
      resolveSmoothParallelSteps(
        branchVoicing,
        firePitchStructure,
        fireRootPc,
        DOUBLE_OCTAVE_FLAT,
        TONAL_CENTER_BB,
        OCTAVE_RANGE,
        'contrary'
      )
    );
    const fireVoicing = computeNeutralTiltVoicing(
      fire,
      fireTilt,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      { anchor: 'contrary', previousChord: branch }
    );

    const magmaPitchStructure = pitchStructureFrom(magma);
    const magmaRootPc = magma.pitches[magma.rootPositionIndex] % OCTAVE;

    const magmaTilt = tiltSampleFromLevels(
      8,
      resolveSmoothParallelSteps(
        fireVoicing,
        magmaPitchStructure,
        magmaRootPc,
        DOUBLE_OCTAVE_FLAT,
        TONAL_CENTER_BB,
        OCTAVE_RANGE,
        'contrary'
      )
    );
    const magmaVoicing = computeNeutralTiltVoicing(
      magma,
      magmaTilt,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      { anchor: 'contrary', previousChord: fire }
    );

    const smoothFireAgainParallel = resolveSmoothParallelSteps(
      magmaVoicing,
      firePitchStructure,
      fireRootPc,
      DOUBLE_OCTAVE_FLAT,
      TONAL_CENTER_BB,
      OCTAVE_RANGE,
      'contrary'
    );

    expect(smoothFireAgainParallel).not.toBe(
      resolvePredeterminedParallelSteps('Fire')
    );
  });
});
