import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager, type Chord } from './ChordManager';
import { getInitialBorrowingState } from './BorrowingLogic';
import {
  resolveDeterministicElementalPlayback,
  resolveElementalPlayback,
} from './elementalRoot';
import { resolveSmoothPlaybackTilt } from './predeterminedVoiceLeading';
import { tiltSampleFromLevels } from './TiltVoicingEngine';
import { computeTiltVoicedPitches } from './tiltVoicingPlayback';
import {
  getVoiceDegreeLabel,
  resolveTiltBassVoiceLine,
  tiltBassDegreeLabel,
  type TiltBassLabelContext,
} from './voiceDegreeLabel';

const TONAL_CENTER = 10;
const OCTAVE_RANGE = 3;
const DOUBLE_OCTAVE_FLAT = tiltSampleFromLevels(8, 0);
const PITCH_UP_ONE = { x: 0, y: -0.25 };

function smoothContext(previousPlayedChord?: Chord | null): TiltBassLabelContext {
  return {
    tonalCenter: TONAL_CENTER,
    octaveRange: OCTAVE_RANGE,
    borrowingState: getInitialBorrowingState(),
    playStyle: 'tilt',
    voiceLeadingMode: 'smooth',
    previousChord: previousPlayedChord,
  };
}

function bassDegreeAtFlat(chordName: string, manager: ChordManager): string {
  const chord = manager.getChordByName(chordName)!;
  const line = resolveTiltBassVoiceLine(
    DOUBLE_OCTAVE_FLAT,
    chord,
    smoothContext()
  );
  return getVoiceDegreeLabel(line ?? 1, chord);
}

function smoothElementalPitches(
  manager: ChordManager,
  elementName: string,
  previousChord: Chord | null | undefined,
  tilt = DOUBLE_OCTAVE_FLAT
): number[] {
  const dict = manager.getChordByName(elementName)!;
  const resolved = resolveDeterministicElementalPlayback(
    dict,
    TONAL_CENTER,
    OCTAVE_RANGE
  );
  return computeTiltVoicedPitches(
    resolved.chord,
    getInitialBorrowingState(),
    resolveSmoothPlaybackTilt(elementName, tilt),
    TONAL_CENTER,
    OCTAVE_RANGE,
    {
      anchor: 'contrary',
      previousChord: previousChord,
      deterministicElemental: true,
      elemental: {
        rootPitchClass: resolved.rootPitchClass,
        homeMidi: resolved.homeMidi,
      },
    }
  );
}

describe('resolveDeterministicElementalPlayback', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
  });

  it('matches resolveElementalPlayback with no previous chord', () => {
    const fire = manager.getChordByName('Fire')!;
    expect(resolveDeterministicElementalPlayback(fire, TONAL_CENTER, OCTAVE_RANGE)).toEqual(
      resolveElementalPlayback(fire, TONAL_CENTER, OCTAVE_RANGE, null)
    );
  });

  it('differs from contextual resolution after Twin Branch', () => {
    const twinBranch = manager.getChordByName('Twin Branch')!;
    const fire = manager.getChordByName('Fire')!;
    const deterministic = resolveDeterministicElementalPlayback(
      fire,
      TONAL_CENTER,
      OCTAVE_RANGE
    );
    const contextual = resolveElementalPlayback(
      fire,
      TONAL_CENTER,
      OCTAVE_RANGE,
      twinBranch
    );
    expect(deterministic.rootPitchClass).not.toBe(contextual.rootPitchClass);
    expect(deterministic.chord.traditionalName).toBe('A diminished');
    expect(contextual.chord.traditionalName).toBe('Eb diminished');
  });
});

describe('smooth mode elemental determinism', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
  });

  it('Fire after Twin Branch matches Fire after Branch at flat double octave', () => {
    const branch = manager.getChordByName('Branch')!;
    const twinBranch = manager.getChordByName('Twin Branch')!;
    const afterBranch = smoothElementalPitches(manager, 'Fire', branch);
    const afterTwin = smoothElementalPitches(manager, 'Fire', twinBranch);
    expect(afterTwin).toEqual(afterBranch);
    expect(afterBranch.length).toBeGreaterThan(0);
  });

  it('Fire pitched up matches regardless of previous chord', () => {
    const branch = manager.getChordByName('Branch')!;
    const twinBranch = manager.getChordByName('Twin Branch')!;
    const pitched = resolveSmoothPlaybackTilt('Fire', PITCH_UP_ONE);
    const dict = manager.getChordByName('Fire')!;
    const resolved = resolveDeterministicElementalPlayback(
      dict,
      TONAL_CENTER,
      OCTAVE_RANGE
    );
    const elementalMeta = {
      rootPitchClass: resolved.rootPitchClass,
      homeMidi: resolved.homeMidi,
    };
    const afterBranch = computeTiltVoicedPitches(
      resolved.chord,
      getInitialBorrowingState(),
      pitched,
      TONAL_CENTER,
      OCTAVE_RANGE,
      {
        anchor: 'contrary',
        previousChord: branch,
        deterministicElemental: true,
        elemental: elementalMeta,
      }
    );
    const afterTwin = computeTiltVoicedPitches(
      resolved.chord,
      getInitialBorrowingState(),
      pitched,
      TONAL_CENTER,
      OCTAVE_RANGE,
      {
        anchor: 'contrary',
        previousChord: twinBranch,
        deterministicElemental: true,
        elemental: elementalMeta,
      }
    );
    expect(afterTwin).toEqual(afterBranch);
  });

  it('flat double octave bass degrees match CHORD_FLAT_PARALLEL table', () => {
    expect(bassDegreeAtFlat('Earth', manager)).toBe('5th');
    expect(bassDegreeAtFlat('Wind', manager)).toBe('6th');
    expect(bassDegreeAtFlat('Fire', manager)).toBe('Root');
  });

  it('labels match voicing for Earth with smooth context', () => {
    const earth = manager.getChordByName('Earth')!;
    expect(
      tiltBassDegreeLabel(DOUBLE_OCTAVE_FLAT, earth, smoothContext())
    ).toBe('5th');
  });
});

describe('root position elemental regression', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
  });

  it('contextual Fire still differs after Twin Branch without deterministic flag', () => {
    const twinBranch = manager.getChordByName('Twin Branch')!;
    const fireDict = manager.getChordByName('Fire')!;
    const resolvedFire = resolveElementalPlayback(
      fireDict,
      TONAL_CENTER,
      OCTAVE_RANGE,
      twinBranch
    ).chord;

    const afterTwin = computeTiltVoicedPitches(
      resolvedFire,
      getInitialBorrowingState(),
      { x: -1, y: 0 },
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary', previousChord: twinBranch }
    );

    const afterDictFire = computeTiltVoicedPitches(
      resolvedFire,
      getInitialBorrowingState(),
      { x: -1, y: 0 },
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary', previousChord: fireDict }
    );

    expect(afterTwin[0]).not.toBe(afterDictFire[0]);
  });
});
