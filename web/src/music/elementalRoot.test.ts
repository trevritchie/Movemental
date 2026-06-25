import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import {
  getDefaultElementalRoot,
  resolveElementalRoot,
  resolveElementalPlayback,
  computeChordHomeMidi,
} from './elementalRoot';
import {
  computeTiltVoicing,
  tiltSampleFromLevels,
} from './TiltVoicingEngine';

describe('elementalRoot', () => {
  let manager: ChordManager;
  const OCTAVE_RANGE = 3;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(10); // Bb
  });

  describe('default diminished names at Bb', () => {
    it('names Earth E diminished, Wind D diminished, Fire A diminished', () => {
      expect(getDefaultElementalRoot('Earth', 10)).toBe(4);
      expect(getDefaultElementalRoot('Wind', 10)).toBe(2);
      expect(getDefaultElementalRoot('Fire', 10)).toBe(9);

      expect(manager.getChordByName('Earth')!.traditionalName).toBe('E diminished');
      expect(manager.getChordByName('Wind')!.traditionalName).toBe('D diminished');
      expect(manager.getChordByName('Fire')!.traditionalName).toBe('A diminished');
    });
  });

  describe('contextual roots after opposite child', () => {
    it('roots Fire at A diminished after Branch (Bb maj6)', () => {
      const branch = manager.getChordByName('Branch')!;
      expect(resolveElementalRoot('Fire', 10, branch)).toBe(9);
      expect(
        resolveElementalPlayback(
          manager.getChordByName('Fire')!,
          10,
          OCTAVE_RANGE,
          branch
        ).chord.traditionalName
      ).toBe('A diminished');
    });

    it('roots Fire at Eb diminished after Twin Branch (E maj6)', () => {
      const twinBranch = manager.getChordByName('Twin Branch')!;
      expect(resolveElementalRoot('Fire', 10, twinBranch)).toBe(3);
      expect(
        resolveElementalPlayback(
          manager.getChordByName('Fire')!,
          10,
          OCTAVE_RANGE,
          twinBranch
        ).chord.traditionalName
      ).toBe('Eb diminished');
    });
  });

  describe('contrary motion voicing at Bb', () => {
    it('places Fire unison one semitone below Branch unison', () => {
      const branch = manager.getChordByName('Branch')!;
      const fire = manager.getChordByName('Fire')!;
      const branchRoot = branch.pitches[branch.rootPositionIndex] % 12;
      const resolved = resolveElementalPlayback(
        fire,
        10,
        OCTAVE_RANGE,
        branch
      );

      const branchUnison = computeChordHomeMidi(branchRoot, 10, OCTAVE_RANGE);
      const fireUnison = resolved.homeMidi;
      expect(fireUnison).toBe(branchUnison - 1);
    });

    it('widens Branch unison to triad then Fire third with contrary motion', () => {
      const branch = manager.getChordByName('Branch')!;
      const fire = manager.getChordByName('Fire')!;
      const branchRoot = branch.pitches[branch.rootPositionIndex] % 12;
      const branchStructure = [...branch.pitches];

      const branchUnison = computeTiltVoicing(
        branchStructure,
        branchRoot,
        { x: -1, y: 0 },
        OCTAVE_RANGE,
        10
      );
      expect(branchUnison).toEqual([70]); // Bb4

      const branchTriad = computeTiltVoicing(
        branchStructure,
        branchRoot,
        tiltSampleFromLevels(2, 0),
        OCTAVE_RANGE,
        10
      );
      expect(branchTriad).toEqual([67, 70, 74]); // G4 Bb4 D5

      const resolved = resolveElementalPlayback(
        fire,
        10,
        OCTAVE_RANGE,
        branch
      );
      const fireThird = computeTiltVoicing(
        [...fire.pitches],
        resolved.rootPitchClass,
        tiltSampleFromLevels(1, 0),
        OCTAVE_RANGE,
        10,
        resolved.homeMidi
      );
      expect(fireThird).toEqual([69, 72]); // A4 C5, one semitone below Branch pivot
    });

    it('places Fire root in the same register as Branch with pivot anchor', () => {
      const branch = manager.getChordByName('Branch')!;
      const fire = manager.getChordByName('Fire')!;
      const branchRoot = branch.pitches[branch.rootPositionIndex] % 12;
      const branchStructure = [...branch.pitches];
      const resolved = resolveElementalPlayback(
        fire,
        10,
        OCTAVE_RANGE,
        branch
      );

      const branchDrop2 = computeTiltVoicing(
        branchStructure,
        branchRoot,
        tiltSampleFromLevels(5, 0),
        OCTAVE_RANGE,
        10,
        undefined,
        { anchor: 'pivot' }
      );
      const fireDrop2 = computeTiltVoicing(
        [...fire.pitches],
        resolved.rootPitchClass,
        tiltSampleFromLevels(5, 0),
        OCTAVE_RANGE,
        10,
        resolved.homeMidi,
        { anchor: 'pivot' }
      );

      expect(Math.min(...branchDrop2)).toBe(58);
      expect(Math.min(...fireDrop2)).toBe(57);
      expect(Math.min(...fireDrop2)).toBe(Math.min(...branchDrop2) - 1);
    });
  });

  describe('works at other tonal centers', () => {
    it('defaults Fire to B diminished at tonal center C', () => {
      manager.setTonalCenterOffset(0);
      expect(getDefaultElementalRoot('Fire', 0)).toBe(11);
      expect(manager.getChordByName('Fire')!.traditionalName).toBe('B diminished');
    });

    it('roots Fire half step below Branch at tonal center D', () => {
      manager.setTonalCenterOffset(2);
      const branch = manager.getChordByName('Branch')!;
      expect(resolveElementalRoot('Fire', 2, branch)).toBe(1);
      expect(
        resolveElementalPlayback(
          manager.getChordByName('Fire')!,
          2,
          OCTAVE_RANGE,
          branch
        ).chord.traditionalName
      ).toBe('Db diminished');
    });
  });
});
