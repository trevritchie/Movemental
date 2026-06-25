import { describe, it, expect, beforeEach } from 'vitest';
import {
  BorrowingLogic,
  getInitialBorrowingState,
  type BorrowingState,
} from '../music/BorrowingLogic';
import type { Chord } from '../music/ChordManager';
import {
  tiltSampleFromLevels,
  DEFAULT_NO_TILT_VOICING_LEVEL,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import {
  applyVoicingOverlays,
  computeNeutralTiltVoicing,
} from '../music/tiltVoicingPlayback';
import { chordManager } from '../music/ChordManager';

const logic = new BorrowingLogic();
const OCTAVE_RANGE = 3;
const BB_TONAL_CENTER = 10;

/** Close voicing at 2nd Position (parallelSteps=1, inputSteps=3 → width 4). */
const SECOND_POSITION_CLOSE = tiltSampleFromLevels(3, 1);

/** Default drone voicing at 2nd Position. */
const DRONE_SECOND_POSITION = tiltSampleFromLevels(
  DEFAULT_NO_TILT_VOICING_LEVEL,
  1
);

/** Widest static voicing (inputSteps 8 = Double Octave). */
const DOUBLE_OCTAVE = tiltSampleFromLevels(8, 0);
const TILT_A = tiltSampleFromLevels(4, 2);

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

function borrowLine(line: 1 | 2 | 3 | 4, direction: 'up' | 'down') {
  const state = getInitialBorrowingState();
  state.circlePositions[line] = direction;
  state.borrowingDirections[line] = direction;
  return state;
}

/** Mirrors playback: neutral ladder voicing + borrow/mute overlays. */
function computeVoicedWithOverlays(
  chord: Chord,
  state: BorrowingState,
  tilt: TiltSample,
  tonalCenter: number,
  neutralVoicing?: number[]
): number[] {
  const neutral =
    neutralVoicing ??
    computeNeutralTiltVoicing(
      chord,
      tilt,
      tonalCenter,
      OCTAVE_RANGE,
      { anchor: 'pivot' }
    );
  return applyVoicingOverlays(neutral, chord, state);
}

describe('borrowing mute integration', () => {
  beforeEach(() => {
    chordManager.setTonalCenterOffset(0);
    chordManager.setOctaveRange(OCTAVE_RANGE);
  });

  it('Branch at C: muting Root removes C at 2nd Position', () => {
    const branch = chordManager.getChordByName('Branch')!;
    expect(branch.pitches).toEqual([0, 4, 7, 9]);

    const voiced = computeVoicedWithOverlays(
      branch,
      muteLine(1),
      SECOND_POSITION_CLOSE,
      0
    );
    expect(pitchClasses(voiced)).not.toContain(0);
    expect(pitchClasses(voiced)).toContain(4);
  });

  it('Branch at C: muting 3rd removes E at 2nd Position', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const voiced = computeVoicedWithOverlays(
      branch,
      muteLine(2),
      SECOND_POSITION_CLOSE,
      0
    );
    expect(pitchClasses(voiced)).not.toContain(4);
    expect(pitchClasses(voiced)).toContain(0);
  });

  it('Branch at Bb: muting Root filters Bb from double octave without re-spreading', () => {
    chordManager.setTonalCenterOffset(BB_TONAL_CENTER);
    const branch = chordManager.getChordByName('Branch')!;

    const full = computeVoicedWithOverlays(
      branch,
      getInitialBorrowingState(),
      DOUBLE_OCTAVE,
      BB_TONAL_CENTER
    );
    const muted = computeVoicedWithOverlays(
      branch,
      muteLine(1),
      DOUBLE_OCTAVE,
      BB_TONAL_CENTER
    );

    expect(muted).toEqual(full.filter((n) => n % 12 !== BB_TONAL_CENTER));
    expect(muted.length).toBeLessThan(full.length);
    expect(muted.length).toBeGreaterThan(0);
  });

  it('Branch at C: muting Root removes all C pitch classes in Double Octave', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const full = computeVoicedWithOverlays(
      branch,
      getInitialBorrowingState(),
      DOUBLE_OCTAVE,
      0
    );
    const muted = computeVoicedWithOverlays(
      branch,
      muteLine(1),
      DOUBLE_OCTAVE,
      0
    );

    expect(muted.every((n) => n % 12 !== 0)).toBe(true);
    expect(muted).toEqual(full.filter((n) => n % 12 !== 0));
  });

  it('Branch at C: drone replay path respects mute at 2nd Position', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const voiced = computeVoicedWithOverlays(
      branch,
      muteLine(1),
      DRONE_SECOND_POSITION,
      0
    );
    expect(pitchClasses(voiced)).not.toContain(0);
    expect(pitchClasses(voiced)).toContain(4);
  });

  it('muting Root is subtractive at every position level', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const muteRoot = muteLine(1);

    for (let position = 0; position <= 3; position += 1) {
      const tilt = tiltSampleFromLevels(8, position);
      const full = computeVoicedWithOverlays(
        branch,
        getInitialBorrowingState(),
        tilt,
        0
      );
      const muted = computeVoicedWithOverlays(
        branch,
        muteRoot,
        tilt,
        0
      );

      expect(muted).toEqual(full.filter((n) => n % 12 !== 0));
      expect(muted.every((n) => n % 12 !== 0)).toBe(true);
      expect(muted.length).toBeGreaterThan(0);
    }
  });

  it('muting all four lines yields no voiced pitches', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const state = getInitialBorrowingState();
    state.noteStates[1] = 'off';
    state.noteStates[2] = 'off';
    state.noteStates[3] = 'off';
    state.noteStates[4] = 'off';

    const voiced = computeVoicedWithOverlays(
      branch,
      state,
      DRONE_SECOND_POSITION,
      0
    );

    expect(voiced).toHaveLength(0);
  });
});

describe('borrowing overlay integration', () => {
  beforeEach(() => {
    chordManager.setTonalCenterOffset(BB_TONAL_CENTER);
    chordManager.setOctaveRange(OCTAVE_RANGE);
  });

  it('Branch at Bb: borrowing 6th up replaces only G in double octave', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const neutral = computeVoicedWithOverlays(
      branch,
      getInitialBorrowingState(),
      DOUBLE_OCTAVE,
      BB_TONAL_CENTER
    );
    const gIndex = neutral.findIndex((n) => n % 12 === 7);
    expect(gIndex).toBeGreaterThanOrEqual(0);

    const borrowed = computeVoicedWithOverlays(
      branch,
      borrowLine(4, 'up'),
      DOUBLE_OCTAVE,
      BB_TONAL_CENTER,
      neutral
    );

    expect(borrowed.length).toBe(neutral.length);
    expect(borrowed.filter((n, i) => n !== neutral[i]).length).toBe(1);
    expect(borrowed[gIndex]! % 12).not.toBe(7);
    expect(borrowed.every((n, i) => i === gIndex || n === neutral[i])).toBe(
      true
    );
  });

  it('Branch at C: borrowing root down moves one semitone, not an octave', () => {
    chordManager.setTonalCenterOffset(0);
    const branch = chordManager.getChordByName('Branch')!;
    const neutral = computeVoicedWithOverlays(
      branch,
      getInitialBorrowingState(),
      DOUBLE_OCTAVE,
      0
    );
    const cIndices = neutral
      .map((n, i) => (n % 12 === 0 ? i : -1))
      .filter((i) => i >= 0);
    expect(cIndices.length).toBeGreaterThan(0);

    const borrowed = computeVoicedWithOverlays(
      branch,
      borrowLine(1, 'down'),
      DOUBLE_OCTAVE,
      0,
      neutral
    );

    expect(borrowed.length).toBe(neutral.length);
    const changed = borrowed
      .map((n, i) => ({ n, i, prev: neutral[i]! }))
      .filter(({ n, prev }) => n !== prev);
    expect(changed.length).toBeGreaterThan(0);
    for (const { n, prev } of changed) {
      expect(prev % 12).toBe(0);
      expect(n % 12).toBe(11);
      expect(Math.abs(n - prev)).toBeLessThanOrEqual(6);
      expect(Math.abs(n - prev)).not.toBe(11);
    }
  });

  it('returning borrowed line to neutral restores exact anchored voicing', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const neutral = computeVoicedWithOverlays(
      branch,
      getInitialBorrowingState(),
      DOUBLE_OCTAVE,
      BB_TONAL_CENTER
    );
    const borrowed = computeVoicedWithOverlays(
      branch,
      borrowLine(4, 'up'),
      DOUBLE_OCTAVE,
      BB_TONAL_CENTER,
      neutral
    );
    expect(borrowed).not.toEqual(neutral);

    const restored = applyVoicingOverlays(
      neutral,
      branch,
      getInitialBorrowingState()
    );
    expect(restored).toEqual(neutral);
  });

  it('borrow overlay uses anchored neutral, not a new tilt sample', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const neutralAtA = computeNeutralTiltVoicing(
      branch,
      TILT_A,
      BB_TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'pivot' }
    );
    const borrowState = borrowLine(4, 'up');

    const overlayAtA = applyVoicingOverlays(neutralAtA, branch, borrowState);
    const overlayAtB = applyVoicingOverlays(neutralAtA, branch, borrowState);

    expect(overlayAtA).toEqual(overlayAtB);
    expect(overlayAtA.length).toBe(neutralAtA.length);
  });

  it('muting a borrowed voice removes both home and borrowed pitch classes', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const neutral = computeVoicedWithOverlays(
      branch,
      getInitialBorrowingState(),
      DOUBLE_OCTAVE,
      BB_TONAL_CENTER
    );
    const borrowed = applyVoicingOverlays(
      neutral,
      branch,
      borrowLine(4, 'up')
    );
    const gPc = 7;
    expect(borrowed.some((n) => n % 12 === gPc)).toBe(false);
    expect(borrowed.length).toBe(neutral.length);

    const mutedWhileBorrowed = getInitialBorrowingState();
    mutedWhileBorrowed.circlePositions[4] = 'up';
    mutedWhileBorrowed.borrowingDirections[4] = 'up';
    mutedWhileBorrowed.noteStates[4] = 'off';

    const muted = applyVoicingOverlays(neutral, branch, mutedWhileBorrowed);
    expect(muted.some((n) => n % 12 === gPc)).toBe(false);
    const { effectivePc } = logic.getVoicePitchClasses(
      branch,
      mutedWhileBorrowed,
      4
    );
    expect(muted.some((n) => n % 12 === effectivePc)).toBe(false);
    expect(muted.length).toBeLessThan(borrowed.length);
  });

  it('mute still subtracts after borrowing overlay', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const neutral = computeVoicedWithOverlays(
      branch,
      getInitialBorrowingState(),
      DOUBLE_OCTAVE,
      BB_TONAL_CENTER
    );
    const state = borrowLine(4, 'up');
    state.noteStates[1] = 'off';

    const voiced = applyVoicingOverlays(neutral, branch, state);
    expect(voiced.every((n) => n % 12 !== BB_TONAL_CENTER)).toBe(true);
    expect(voiced.length).toBeLessThan(neutral.length);
  });
});
