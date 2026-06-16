import { describe, it, expect, beforeEach } from 'vitest';
import {
  BorrowingLogic,
  getInitialBorrowingState,
  type BorrowingState,
} from '../music/BorrowingLogic';
import type { Chord } from '../music/ChordManager';
import {
  computeTiltVoicing,
  tiltSampleFromLevels,
  DEFAULT_STATIC_VOICING_LEVEL,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import { chordManager } from '../music/ChordManager';

const logic = new BorrowingLogic();
const OCTAVE_RANGE = 3;
const BB_TONAL_CENTER = 10;

/** Close voicing at 2nd Position (parallelSteps=1, inputSteps=3 → width 4). */
const SECOND_POSITION_CLOSE = tiltSampleFromLevels(3, 1);

/** Default drone voicing at 2nd Position. */
const DRONE_SECOND_POSITION = tiltSampleFromLevels(
  DEFAULT_STATIC_VOICING_LEVEL,
  1
);

const DOUBLE_OCTAVE = tiltSampleFromLevels(DEFAULT_STATIC_VOICING_LEVEL, 0);

function pitchClasses(midiNotes: number[]): number[] {
  return [...new Set(midiNotes.map((n) => ((n % 12) + 12) % 12))].sort(
    (a, b) => a - b
  );
}

function muteLine(line: 1 | 2 | 3 | 4) {
  const state = getInitialBorrowingState();
  state.noteStates[line] = 'off';
  return state;
}

/** Mirrors useChordPlayback.computeVoicedPitches mute behavior. */
function computeVoicedWithMutes(
  chord: Chord,
  state: BorrowingState,
  tilt: TiltSample,
  octaveRange: number,
  tonalCenter: number
): number[] {
  const structure = logic.generatePitchStructureForVoicing(chord, state);
  const rootPitchClass = chord.pitches[chord.rootPositionIndex] % 12;
  const voiced = computeTiltVoicing(
    structure,
    rootPitchClass,
    tilt,
    octaveRange,
    tonalCenter
  );
  return logic.filterVoicingMutes(
    voiced,
    logic.getMutedPitchClasses(chord, state)
  );
}

describe('borrowing mute integration', () => {
  beforeEach(() => {
    chordManager.setTonalCenterOffset(0);
    chordManager.setOctaveRange(OCTAVE_RANGE);
  });

  it('Branch at C: muting Root removes C at 2nd Position', () => {
    const branch = chordManager.getChordByName('Branch')!;
    expect(branch.pitches).toEqual([0, 4, 7, 9]);

    const voiced = computeVoicedWithMutes(
      branch,
      muteLine(1),
      SECOND_POSITION_CLOSE,
      OCTAVE_RANGE,
      0
    );
    expect(pitchClasses(voiced)).not.toContain(0);
    expect(pitchClasses(voiced)).toContain(4);
  });

  it('Branch at C: muting 3rd removes E at 2nd Position', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const voiced = computeVoicedWithMutes(
      branch,
      muteLine(2),
      SECOND_POSITION_CLOSE,
      OCTAVE_RANGE,
      0
    );
    expect(pitchClasses(voiced)).not.toContain(4);
    expect(pitchClasses(voiced)).toContain(0);
  });

  it('Branch at Bb: muting Root filters Bb from double octave without re-spreading', () => {
    chordManager.setTonalCenterOffset(BB_TONAL_CENTER);
    const branch = chordManager.getChordByName('Branch')!;

    const full = computeVoicedWithMutes(
      branch,
      getInitialBorrowingState(),
      DOUBLE_OCTAVE,
      OCTAVE_RANGE,
      BB_TONAL_CENTER
    );
    const muted = computeVoicedWithMutes(
      branch,
      muteLine(1),
      DOUBLE_OCTAVE,
      OCTAVE_RANGE,
      BB_TONAL_CENTER
    );

    expect(full).toEqual([58, 67, 74, 77, 82]);
    expect(muted).toEqual([67, 74, 77]);
    expect(muted).toEqual(full.filter((n) => n % 12 !== BB_TONAL_CENTER));
  });

  it('Branch at C: muting Root removes all C pitch classes in Double Octave', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const full = computeVoicedWithMutes(
      branch,
      getInitialBorrowingState(),
      DOUBLE_OCTAVE,
      OCTAVE_RANGE,
      0
    );
    const muted = computeVoicedWithMutes(
      branch,
      muteLine(1),
      DOUBLE_OCTAVE,
      OCTAVE_RANGE,
      0
    );

    expect(muted.every((n) => n % 12 !== 0)).toBe(true);
    expect(muted).toEqual(full.filter((n) => n % 12 !== 0));
  });

  it('Branch at C: drone replay path respects mute at 2nd Position', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const voiced = computeVoicedWithMutes(
      branch,
      muteLine(1),
      DRONE_SECOND_POSITION,
      OCTAVE_RANGE,
      0
    );
    expect(pitchClasses(voiced)).not.toContain(0);
    expect(pitchClasses(voiced)).toContain(4);
  });

  it('muting Root is subtractive at every position level', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const muteRoot = muteLine(1);

    for (let position = 0; position <= 3; position += 1) {
      const tilt = tiltSampleFromLevels(DEFAULT_STATIC_VOICING_LEVEL, position);
      const full = computeVoicedWithMutes(
        branch,
        getInitialBorrowingState(),
        tilt,
        OCTAVE_RANGE,
        0
      );
      const muted = computeVoicedWithMutes(
        branch,
        muteRoot,
        tilt,
        OCTAVE_RANGE,
        0
      );

      expect(muted).toEqual(full.filter((n) => n % 12 !== 0));
      expect(muted.every((n) => n % 12 !== 0)).toBe(true);
      expect(muted.length).toBeGreaterThan(0);
    }
  });
});
