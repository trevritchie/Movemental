import { describe, it, expect } from 'vitest';
import { BorrowingLogic, getInitialBorrowingState } from './BorrowingLogic';
import { chordManager } from './ChordManager';

describe('BorrowingLogic', () => {
  const logic = new BorrowingLogic();

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
