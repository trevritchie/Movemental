import { describe, it, expect, beforeEach } from 'vitest';
import { BorrowingLogic, getInitialBorrowingState } from './BorrowingLogic';
import { chordManager } from './ChordManager';

describe('BorrowingLogic', () => {
  const logic = new BorrowingLogic();

  beforeEach(() => {
    chordManager.setTonalCenterOffset(0);
  });

  const firePitches = [62, 65, 68, 71]; // D4, F4, Ab4, B4

  describe('findNextHigherNote', () => {
    it('returns the next higher pitch class in the same octave', () => {
      // C4 (60) -> D4 (62)
      expect(logic.findNextHigherNote(60, firePitches)).toBe(62);
    });

    it('wraps to the lowest pitch class in the next octave when none higher', () => {
      // B4 (71) -> D4 in next octave (74)
      expect(logic.findNextHigherNote(71, firePitches)).toBe(74);
    });
  });

  describe('findNextLowerNote', () => {
    it('returns the next lower pitch class in the same octave', () => {
      // F4 (65) -> D4 (62)
      expect(logic.findNextLowerNote(65, firePitches)).toBe(62);
    });

    it('wraps to the highest pitch class in the previous octave when none lower', () => {
      // D4 (62) -> B4 in previous octave (59)
      expect(logic.findNextLowerNote(62, firePitches)).toBe(59);
    });
  });

  describe('getRootPositionMapping', () => {
    it('maps Branch at C by harmonic degree', () => {
      const branch = chordManager.getChordByName('Branch')!;
      expect(branch.pitches).toEqual([0, 4, 7, 9]);
      expect(branch.rootPositionIndex).toBe(0);
      expect(logic.getRootPositionMapping(branch)).toEqual({
        1: 0,
        2: 1,
        3: 2,
        4: 3,
      });
    });

    it('maps Brother Branch at C with root on dictionary first pitch', () => {
      const bro = chordManager.getChordByName('Brother Branch')!;
      expect(bro.pitches).toEqual([0, 3, 7, 10]);
      expect(bro.rootPositionIndex).toBe(1);
      expect(logic.getRootPositionMapping(bro)).toEqual({
        1: 1,
        2: 2,
        3: 3,
        4: 0,
      });
    });
  });

  describe('generatePitchStructure', () => {
    it('nulls exactly one slot when each Branch voice is muted', () => {
      const branch = chordManager.getChordByName('Branch')!;
      const allOn = logic.generatePitchStructure(
        branch,
        getInitialBorrowingState()
      );
      expect(allOn).toEqual([0, 4, 7, 9]);

      const muteRoot = getInitialBorrowingState();
      muteRoot.noteStates[1] = 'off';
      expect(logic.generatePitchStructure(branch, muteRoot)).toEqual([
        null,
        4,
        7,
        9,
      ]);

      const muteThird = getInitialBorrowingState();
      muteThird.noteStates[2] = 'off';
      expect(logic.generatePitchStructure(branch, muteThird)).toEqual([
        0,
        null,
        7,
        9,
      ]);

      const muteFifth = getInitialBorrowingState();
      muteFifth.noteStates[3] = 'off';
      expect(logic.generatePitchStructure(branch, muteFifth)).toEqual([
        0,
        4,
        null,
        9,
      ]);

      const muteSixth = getInitialBorrowingState();
      muteSixth.noteStates[4] = 'off';
      expect(logic.generatePitchStructure(branch, muteSixth)).toEqual([
        0,
        4,
        7,
        null,
      ]);
    });

    it('skips borrowing on muted lines in pitch structure', () => {
      const branch = chordManager.getChordByName('Branch')!;
      const state = getInitialBorrowingState();
      state.noteStates[1] = 'off';
      state.circlePositions[1] = 'up';
      state.borrowingDirections[1] = 'up';

      const structure = logic.generatePitchStructure(branch, state);
      expect(structure[0]).toBeNull();
      expect(structure[1]).toBe(4);
    });

    it('getMutedPitchClasses uses borrowed pitch when line is muted', () => {
      const branch = chordManager.getChordByName('Branch')!;
      const state = getInitialBorrowingState();
      state.noteStates[1] = 'off';
      state.circlePositions[1] = 'up';
      state.borrowingDirections[1] = 'up';

      const muted = logic.getMutedPitchClasses(branch, state);
      expect(muted.has(0)).toBe(false);
      expect(muted.has(2)).toBe(true);
    });
  });

  describe('generateActivePitches', () => {
    it('changes voiced output when Trunk voice 1 is shifted up', () => {
      const trunk = chordManager.getChordByName('Trunk');
      expect(trunk).toBeDefined();

      const baseline = logic.generateActivePitches(trunk!, getInitialBorrowingState());

      const shifted = getInitialBorrowingState();
      shifted.circlePositions[1] = 'up';
      shifted.borrowingDirections[1] = 'up';

      const borrowed = logic.generateActivePitches(trunk!, shifted);

      expect(borrowed).not.toEqual(baseline);
      expect(borrowed.filter(p => p !== null).length).toBe(4);
    });
  });
});
