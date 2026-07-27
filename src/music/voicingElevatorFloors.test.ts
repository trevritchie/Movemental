import { describe, expect, it } from 'vitest';
import {
  allowedVoicingLevels,
  applyElevatorFloorsToTilt,
  EVERY_OTHER_CHILD_INPUT_STEPS,
  EVERY_OTHER_PARENT_INPUT_STEPS,
  everyOtherInputStepsFromRoll,
  everyOtherStopIndexFromRoll,
  isParentElementChord,
  snapVoicingLevelToAllowed,
} from './voicingElevatorFloors';
import {
  mapTiltToPositions,
  tiltSampleFromLevels,
  TILT_VOICING_LEVEL_NAMES,
} from './TiltVoicingEngine';

describe('voicingElevatorFloors', () => {
  it('classifies only Earth, Wind, and Fire as parent elements', () => {
    expect(isParentElementChord('Earth')).toBe(true);
    expect(isParentElementChord('Wind')).toBe(true);
    expect(isParentElementChord('Fire')).toBe(true);
    expect(isParentElementChord('Branch')).toBe(false);
    expect(isParentElementChord('Charcoal')).toBe(false);
    expect(isParentElementChord(null)).toBe(false);
  });

  it('maps five evenly spaced roll stops for children and parents', () => {
    const childNames = EVERY_OTHER_CHILD_INPUT_STEPS.map(
      (steps) => TILT_VOICING_LEVEL_NAMES[steps],
    );
    const parentNames = EVERY_OTHER_PARENT_INPUT_STEPS.map(
      (steps) => TILT_VOICING_LEVEL_NAMES[steps],
    );

    expect(childNames).toEqual([
      'Unison',
      'Triad',
      'Octave',
      'Drop 3',
      'Double Octave',
    ]);
    expect(parentNames).toEqual([
      'Third',
      'Close',
      'Drop 2',
      'Drop 2&4',
      'Drop 2&4',
    ]);
  });

  it('at vertical roll, on chords are Unison and parents are Third', () => {
    expect(everyOtherInputStepsFromRoll(-1, 'Branch')).toBe(0);
    expect(everyOtherInputStepsFromRoll(-1, 'Earth')).toBe(1);
    expect(TILT_VOICING_LEVEL_NAMES[0]).toBe('Unison');
    expect(TILT_VOICING_LEVEL_NAMES[1]).toBe('Third');
  });

  it('at flat roll, children are Double Octave and parents are Drop 2&4', () => {
    expect(everyOtherInputStepsFromRoll(0, 'Branch')).toBe(8);
    expect(everyOtherInputStepsFromRoll(0, 'Fire')).toBe(7);
    expect(everyOtherStopIndexFromRoll(0)).toBe(4);
  });

  it('snaps live tilt samples onto absolute inputSteps for Every Other', () => {
    const vertical = applyElevatorFloorsToTilt(
      { x: -1, y: 0 },
      'every_other',
      'Branch',
    );
    expect(mapTiltToPositions(vertical).inputSteps).toBe(0);

    const parentVertical = applyElevatorFloorsToTilt(
      { x: -1, y: 0 },
      'every_other',
      'Wind',
    );
    expect(mapTiltToPositions(parentVertical).inputSteps).toBe(1);

    const allMode = applyElevatorFloorsToTilt(
      { x: -0.5, y: 0 },
      'all',
      'Branch',
    );
    expect(allMode).toEqual({ x: -0.5, y: 0 });
  });

  it('does not alter absolute no-tilt samples when mode is all', () => {
    const sample = tiltSampleFromLevels(5, 0);
    expect(applyElevatorFloorsToTilt(sample, 'all', 'Earth')).toBe(sample);
  });

  it('filters dropdown levels and snaps to the nearest allowed floor', () => {
    expect(allowedVoicingLevels('all', 'Branch')).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(allowedVoicingLevels('every_other', 'Branch')).toEqual([
      0, 2, 4, 6, 8,
    ]);
    expect(allowedVoicingLevels('every_other', 'Earth')).toEqual([
      1, 3, 5, 7,
    ]);

    // Default Drop 2 (5) snaps to Octave (4) for children.
    expect(snapVoicingLevelToAllowed(5, [0, 2, 4, 6, 8])).toBe(4);
    // Parents keep Drop 2.
    expect(snapVoicingLevelToAllowed(5, [1, 3, 5, 7])).toBe(5);
  });
});
