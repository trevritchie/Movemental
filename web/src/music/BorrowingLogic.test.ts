import { describe, it, expect, beforeEach } from 'vitest';
import { BorrowingLogic, getInitialBorrowingState, type BorrowingState, closestMidiWithPitchClass } from './BorrowingLogic';
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

    it('getMutedPitchClasses mutes natural and borrowed PC when line is off', () => {
      const branch = chordManager.getChordByName('Branch')!;
      const state = getInitialBorrowingState();
      state.noteStates[1] = 'off';
      state.circlePositions[1] = 'up';
      state.borrowingDirections[1] = 'up';

      const muted = logic.getMutedPitchClasses(branch, state);
      expect(muted.has(0)).toBe(true);
      expect(muted.has(2)).toBe(true);
    });
  });

  describe('prepareVoicingInput', () => {
    it('builds structure and mutes in one pass', () => {
      const branch = chordManager.getChordByName('Branch')!;
      const state: BorrowingState = {
        ...getInitialBorrowingState(),
        active: true,
        chordName: 'Branch',
        noteStates: { 1: 'on', 2: 'off', 3: 'on', 4: 'on' },
      };
      const { pitchStructure, mutedPitchClasses } =
        logic.prepareVoicingInput(branch, state);
      expect(pitchStructure.filter((p) => p !== null).length).toBe(4);
      expect(mutedPitchClasses.size).toBe(1);
    });

    it('matches separate structure and mute helpers', () => {
      const branch = chordManager.getChordByName('Branch')!;
      const state: BorrowingState = {
        ...getInitialBorrowingState(),
        active: true,
        chordName: 'Branch',
        circlePositions: { 1: 'up', 2: 'line', 3: 'line', 4: 'line' },
        borrowingDirections: { 1: 'up', 2: null, 3: null, 4: null },
      };
      const combined = logic.prepareVoicingInput(branch, state);
      expect(combined.pitchStructure).toEqual(
        logic.generatePitchStructureForVoicing(branch, state)
      );
      expect(combined.mutedPitchClasses).toEqual(
        logic.getMutedPitchClasses(branch, state)
      );
    });
  });

  describe('closestMidiWithPitchClass', () => {
    it('places B one semitone below C4 when borrowing down across the octave', () => {
      expect(closestMidiWithPitchClass(60, 11)).toBe(59);
    });

    it('places D two semitones above C4 when borrowing up', () => {
      expect(closestMidiWithPitchClass(60, 2)).toBe(62);
    });

    it('places C one semitone above B4 when borrowing up across the octave', () => {
      expect(closestMidiWithPitchClass(71, 0)).toBe(72);
    });
  });

  describe('applyBorrowingOverlay', () => {
    it('replaces natural pitch class at the closest MIDI octave', () => {
      chordManager.setTonalCenterOffset(10);
      const branch = chordManager.getChordByName('Branch')!;
      const neutral = [70, 79, 86, 89, 94];
      const state = getInitialBorrowingState();
      state.circlePositions[4] = 'up';
      state.borrowingDirections[4] = 'up';

      const { naturalPc, effectivePc } = logic.getVoicePitchClasses(
        branch,
        state,
        4
      );
      expect(naturalPc).toBe(7);
      expect(effectivePc).not.toBe(7);

      const gIndex = neutral.findIndex((n) => n % 12 === 7);
      expect(gIndex).toBeGreaterThanOrEqual(0);

      const overlaid = logic.applyBorrowingOverlay(neutral, branch, state);
      expect(overlaid[gIndex]).toBe(
        closestMidiWithPitchClass(neutral[gIndex]!, effectivePc)
      );
      expect(overlaid.filter((n, i) => n !== neutral[i]).length).toBe(1);
    });

    it('borrows root down to the nearest B, not an octave above C', () => {
      const branch = chordManager.getChordByName('Branch')!;
      const neutral = [60, 64, 67, 69];
      const state = getInitialBorrowingState();
      state.circlePositions[1] = 'down';
      state.borrowingDirections[1] = 'down';

      const overlaid = logic.applyBorrowingOverlay(neutral, branch, state);
      const cIndex = neutral.findIndex((n) => n % 12 === 0);
      expect(cIndex).toBeGreaterThanOrEqual(0);
      expect(overlaid[cIndex]).toBe(59);
      expect(Math.abs(overlaid[cIndex]! - neutral[cIndex]!)).toBe(1);
    });

    it('returns neutral voicing when all lines are on neutral', () => {
      const branch = chordManager.getChordByName('Branch')!;
      const neutral = [58, 67, 74, 77, 82];
      expect(
        logic.applyBorrowingOverlay(
          neutral,
          branch,
          getInitialBorrowingState()
        )
      ).toEqual(neutral);
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
