import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import { borrowingLogic, getInitialBorrowingState } from './BorrowingLogic';
import {
  getDefaultElementalRoot,
  resolveElementalRoot,
  resolveElementalPlayback,
  resolveElementalForNavigation,
  resolveOppositeElementalPlayback,
  computeChordHomeMidi,
  isOppositeElementNavigation,
  previousBassMidi,
} from './elementalRoot';
import {
  computeTiltVoicing,
  parallelLevelFromTilt,
  tiltSampleFromLevels,
} from './TiltVoicingEngine';
import { resolveSmoothPlaybackTilt } from './predeterminedVoiceLeading';
import { computeTiltVoicedPitches } from './tiltVoicingPlayback';
import {
  getVoiceDegreeLabel,
  type VoiceLine,
} from './voiceDegreeLabel';

describe('elementalRoot', () => {
  let manager: ChordManager;
  const OCTAVE_RANGE = 3;
  // Bb tonal center; matches product default for elemental diminished tests.
  const TONAL_CENTER = 10;
  // Flat double-octave roll at parallel 0 (smooth mode starting tilt).
  const DOUBLE_OCTAVE_FLAT = tiltSampleFromLevels(8, 0);

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
  });

  function voicedBassMidi(
    chordName: string,
    tilt = DOUBLE_OCTAVE_FLAT
  ): number {
    const chord = manager.getChordByName(chordName)!;
    const pitches = computeTiltVoicedPitches(
      chord,
      getInitialBorrowingState(),
      tilt,
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary' }
    );
    return previousBassMidi(pitches)!;
  }

  function bassDegreeFromVoiced(
    chord: ReturnType<ChordManager['getChordByName']>,
    voiced: number[]
  ): string {
    const structure = borrowingLogic.prepareVoicingInput(
      chord!,
      getInitialBorrowingState()
    ).pitchStructure;
    const lowestPc = ((Math.min(...voiced) % 12) + 12) % 12;
    const mapping = borrowingLogic.getRootPositionMapping(chord!);
    for (let line = 1; line <= 4; line++) {
      const pitch = structure[mapping[line]];
      if (pitch !== null && ((pitch % 12) + 12) % 12 === lowestPc) {
        return getVoiceDegreeLabel(line as VoiceLine, chord ?? null);
      }
    }
    return '?';
  }

  function elementalVoicedPitches(
    resolved: ReturnType<typeof resolveElementalForNavigation>,
    tilt: ReturnType<typeof tiltSampleFromLevels>
  ): number[] {
    return computeTiltVoicedPitches(
      resolved.chord,
      getInitialBorrowingState(),
      tilt,
      TONAL_CENTER,
      OCTAVE_RANGE,
      {
        anchor: 'contrary',
        elemental: {
          rootPitchClass: resolved.rootPitchClass,
          homeMidi: resolved.homeMidi,
        },
      }
    );
  }

  function windVoicingAtFlat(
    resolved: ReturnType<typeof resolveElementalForNavigation>,
    windTilt = tiltSampleFromLevels(
      8,
      parallelLevelFromTilt(resolveSmoothPlaybackTilt('Glass', DOUBLE_OCTAVE_FLAT))
    )
  ): number[] {
    return elementalVoicedPitches(resolved, windTilt);
  }

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

  describe('isOppositeElementNavigation', () => {
    it('detects Glass -> Wind and Branch -> Fire', () => {
      expect(
        isOppositeElementNavigation(manager.getChordByName('Glass')!, 'Wind')
      ).toBe(true);
      expect(
        isOppositeElementNavigation(manager.getChordByName('Branch')!, 'Fire')
      ).toBe(true);
    });

    it('rejects Branch -> Wind', () => {
      expect(
        isOppositeElementNavigation(manager.getChordByName('Branch')!, 'Wind')
      ).toBe(false);
    });
  });

  describe('resolveElementalRoot', () => {
    it('always returns the default diminished root', () => {
      const branch = manager.getChordByName('Branch')!;
      expect(resolveElementalRoot('Fire', 10)).toBe(9);
      expect(resolveElementalRoot('Fire', 10)).toBe(
        getDefaultElementalRoot('Fire', 10)
      );
      expect(resolveElementalRoot('Fire', 10)).toBe(
        resolveElementalRoot('Fire', 10)
      );
      expect(branch).toBeDefined();
    });
  });

  describe('opposite-element bass search', () => {
    it('roots Fire at A diminished after Branch when bass matches structural root', () => {
      const branch = manager.getChordByName('Branch')!;
      const fire = manager.getChordByName('Fire')!;
      const branchBass = voicedBassMidi('Branch');
      const windTilt = resolveSmoothPlaybackTilt('Fire', DOUBLE_OCTAVE_FLAT);
      const resolved = resolveElementalForNavigation(
        fire,
        TONAL_CENTER,
        OCTAVE_RANGE,
        branch,
        branchBass,
        windTilt,
        'contrary'
      );
      expect(resolved.chord.traditionalName).toBe('A diminished');
      expect(resolved.rootPitchClass).toBe(9);
    });

    it('roots Fire at Eb diminished after Twin Branch using sounded bass', () => {
      const twinBranch = manager.getChordByName('Twin Branch')!;
      const fire = manager.getChordByName('Fire')!;
      const twinBass = voicedBassMidi('Twin Branch');
      const fireTilt = resolveSmoothPlaybackTilt('Fire', DOUBLE_OCTAVE_FLAT);
      const resolved = resolveElementalForNavigation(
        fire,
        TONAL_CENTER,
        OCTAVE_RANGE,
        twinBranch,
        twinBass,
        fireTilt,
        'contrary'
      );
      expect(resolved.chord.traditionalName).toBe('Eb diminished');
      expect(resolved.rootPitchClass).toBe(3);

      const voiced = elementalVoicedPitches(resolved, fireTilt);
      expect(Math.min(...voiced)).toBe(twinBass - 1);
    });

    it('prefers one semitone below, then two', () => {
      const wind = manager.getChordByName('Wind')!;
      const glassBass = voicedBassMidi('Glass');
      const windTilt = resolveSmoothPlaybackTilt('Wind', DOUBLE_OCTAVE_FLAT);

      const minusOne = resolveOppositeElementalPlayback(
        wind,
        TONAL_CENTER,
        OCTAVE_RANGE,
        glassBass,
        windTilt,
        'contrary'
      );
      expect(minusOne).not.toBeNull();
      const voiced = elementalVoicedPitches(minusOne!, windTilt);
      expect(Math.min(...voiced)).toBe(glassBass - 1);
    });

    it('Glass -> Wind picks non-default diminished root below Glass bass', () => {
      const glass = manager.getChordByName('Glass')!;
      const wind = manager.getChordByName('Wind')!;
      const glassTilt = resolveSmoothPlaybackTilt('Glass', DOUBLE_OCTAVE_FLAT);
      const glassBass = voicedBassMidi('Glass', glassTilt);
      const windTilt = tiltSampleFromLevels(
        8,
        parallelLevelFromTilt(glassTilt)
      );
      const resolved = resolveElementalForNavigation(
        wind,
        TONAL_CENTER,
        OCTAVE_RANGE,
        glass,
        glassBass,
        windTilt,
        'contrary'
      );
      expect(resolved.chord.traditionalName).toBe('D diminished');
      const windVoicing = windVoicingAtFlat(resolved, windTilt);
      expect(glassBass - Math.min(...windVoicing)).toBe(2);
      expect(bassDegreeFromVoiced(resolved.chord, windVoicing)).toBe('5th');
    });

    it('Branch -> Wind keeps default D diminished', () => {
      const branch = manager.getChordByName('Branch')!;
      const wind = manager.getChordByName('Wind')!;
      const branchBass = voicedBassMidi('Branch');
      const windTilt = resolveSmoothPlaybackTilt('Wind', DOUBLE_OCTAVE_FLAT);
      const resolved = resolveElementalForNavigation(
        wind,
        TONAL_CENTER,
        OCTAVE_RANGE,
        branch,
        branchBass,
        windTilt,
        'contrary'
      );
      const defaultWind = resolveElementalPlayback(
        wind,
        TONAL_CENTER,
        OCTAVE_RANGE
      );
      expect(resolved.rootPitchClass).toBe(defaultWind.rootPitchClass);
      expect(resolved.chord.traditionalName).toBe('D diminished');
      const windTableTilt = resolveSmoothPlaybackTilt('Wind', DOUBLE_OCTAVE_FLAT);
      const defaultVoicing = windVoicingAtFlat(defaultWind, windTableTilt);
      expect(bassDegreeFromVoiced(defaultWind.chord, defaultVoicing)).toBe(
        '6th'
      );
    });
  });

  describe('contrary motion voicing at Bb', () => {
    it('places Fire unison one semitone below Branch unison', () => {
      const branch = manager.getChordByName('Branch')!;
      const fire = manager.getChordByName('Fire')!;
      const branchRoot = branch.pitches[branch.rootPositionIndex] % 12;
      const branchBass = voicedBassMidi('Branch');
      const resolved = resolveElementalForNavigation(
        fire,
        TONAL_CENTER,
        OCTAVE_RANGE,
        branch,
        branchBass,
        { x: -1, y: 0 },
        'contrary'
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
      expect(branchUnison).toEqual([70]);

      const branchTriad = computeTiltVoicing(
        branchStructure,
        branchRoot,
        tiltSampleFromLevels(2, 0),
        OCTAVE_RANGE,
        10
      );
      expect(branchTriad).toEqual([67, 70, 74]);

      const branchBass = voicedBassMidi('Branch');
      const resolved = resolveElementalForNavigation(
        fire,
        TONAL_CENTER,
        OCTAVE_RANGE,
        branch,
        branchBass,
        tiltSampleFromLevels(1, 0),
        'contrary'
      );
      const fireThird = computeTiltVoicing(
        [...fire.pitches],
        resolved.rootPitchClass,
        tiltSampleFromLevels(1, 0),
        OCTAVE_RANGE,
        10,
        resolved.homeMidi
      );
      expect(fireThird).toEqual([69, 72]);
    });

    it('places Fire root in the same register as Branch with pivot anchor', () => {
      const branch = manager.getChordByName('Branch')!;
      const fire = manager.getChordByName('Fire')!;
      const branchRoot = branch.pitches[branch.rootPositionIndex] % 12;
      const branchStructure = [...branch.pitches];
      const branchBass = voicedBassMidi('Branch');
      const resolved = resolveElementalForNavigation(
        fire,
        TONAL_CENTER,
        OCTAVE_RANGE,
        branch,
        branchBass,
        tiltSampleFromLevels(5, 0),
        'pivot'
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

    it('roots Fire below Twin Branch bass at tonal center D', () => {
      manager.setTonalCenterOffset(2);
      const twinBranch = manager.getChordByName('Twin Branch')!;
      const fire = manager.getChordByName('Fire')!;
      const twinBass = voicedBassMidi('Twin Branch');
      const resolved = resolveElementalForNavigation(
        fire,
        2,
        OCTAVE_RANGE,
        twinBranch,
        twinBass,
        { x: -1, y: 0 },
        'contrary'
      );
      const voiced = elementalVoicedPitches(resolved, { x: -1, y: 0 });
      const delta = twinBass - Math.min(...voiced);
      expect(delta).toBeGreaterThanOrEqual(1);
      expect(delta).toBeLessThanOrEqual(2);
      expect(resolved.rootPitchClass).not.toBe(
        getDefaultElementalRoot('Fire', 2)
      );
    });
  });
});
