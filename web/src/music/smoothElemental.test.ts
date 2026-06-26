import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager, type Chord } from './ChordManager';
import { getInitialBorrowingState } from './BorrowingLogic';
import {
  resolveDeterministicElementalPlayback,
  resolveElementalForNavigation,
  previousBassMidi,
} from './elementalRoot';
import { resolveSmoothPlaybackTilt } from './predeterminedVoiceLeading';
import {
  parallelLevelFromTilt,
  tiltSampleFromLevels,
} from './TiltVoicingEngine';
import { computeTiltVoicedPitches } from './tiltVoicingPlayback';
import {
  bassDegreeLabelFromVoiced,
  getVoiceDegreeLabel,
  resolveTiltBassVoiceLine,
  tiltBassDegreeLabel,
  type TiltBassLabelContext,
} from './voiceDegreeLabel';

const TONAL_CENTER = 10;
const OCTAVE_RANGE = 3;
// Flat double-octave roll at parallel 0 (smooth mode starting tilt).
const DOUBLE_OCTAVE_FLAT = tiltSampleFromLevels(8, 0);
const PITCH_UP_ONE = { x: 0, y: -0.25 };

function smoothContext(previousPlayedChord?: Chord | null): TiltBassLabelContext {
  return {
    tonalCenter: TONAL_CENTER,
    octaveRange: OCTAVE_RANGE,
    borrowingState: getInitialBorrowingState(),
    tiltModeEnabled: true,
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

function elementalVoicedPitches(
  resolved: ReturnType<typeof resolveElementalForNavigation>,
  tilt: ReturnType<typeof resolveSmoothPlaybackTilt>
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

function navigationElementalPitches(
  manager: ChordManager,
  elementName: string,
  previousChord: Chord,
  previousVoicing: number[],
  tilt = DOUBLE_OCTAVE_FLAT
): number[] {
  const dict = manager.getChordByName(elementName)!;
  const playbackTilt = resolveSmoothPlaybackTilt(elementName, tilt);
  const resolved = resolveElementalForNavigation(
    dict,
    TONAL_CENTER,
    OCTAVE_RANGE,
    previousChord,
    previousBassMidi(previousVoicing),
    playbackTilt,
    'contrary'
  );
  return elementalVoicedPitches(resolved, playbackTilt);
}

function voicedPreviousChord(
  manager: ChordManager,
  chordName: string,
  tilt = DOUBLE_OCTAVE_FLAT
): { chord: Chord; voicing: number[] } {
  const chord = manager.getChordByName(chordName)!;
  const voicing = computeTiltVoicedPitches(
    chord,
    getInitialBorrowingState(),
    tilt,
    TONAL_CENTER,
    OCTAVE_RANGE,
    { anchor: 'contrary' }
  );
  return { chord, voicing };
}

describe('resolveDeterministicElementalPlayback', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
  });

  it('matches default elemental playback', () => {
    const fire = manager.getChordByName('Fire')!;
    expect(resolveDeterministicElementalPlayback(fire, TONAL_CENTER, OCTAVE_RANGE)).toEqual(
      resolveDeterministicElementalPlayback(fire, TONAL_CENTER, OCTAVE_RANGE)
    );
  });
});

describe('opposite-element navigation (all modes)', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
  });

  it('Fire after Twin Branch differs from Fire after Branch at flat double octave', () => {
    const { chord: branch, voicing: branchVoicing } = voicedPreviousChord(
      manager,
      'Branch'
    );
    const { chord: twinBranch, voicing: twinVoicing } = voicedPreviousChord(
      manager,
      'Twin Branch'
    );
    const afterBranch = navigationElementalPitches(
      manager,
      'Fire',
      branch,
      branchVoicing
    );
    const afterTwin = navigationElementalPitches(
      manager,
      'Fire',
      twinBranch,
      twinVoicing
    );
    expect(afterTwin).not.toEqual(afterBranch);
    expect(afterBranch.length).toBeGreaterThan(0);
    expect(afterTwin.length).toBeGreaterThan(0);
  });

  it('Glass -> Wind picks diminished root below Glass bass', () => {
    const glassTilt = resolveSmoothPlaybackTilt('Glass', DOUBLE_OCTAVE_FLAT);
    const { chord: glass, voicing } = voicedPreviousChord(
      manager,
      'Glass',
      glassTilt
    );
    const windTilt = tiltSampleFromLevels(8, parallelLevelFromTilt(glassTilt));
    const resolved = resolveElementalForNavigation(
      manager.getChordByName('Wind')!,
      TONAL_CENTER,
      OCTAVE_RANGE,
      glass,
      previousBassMidi(voicing),
      windTilt,
      'contrary'
    );
    const windPitches = elementalVoicedPitches(resolved, windTilt);
    expect(resolved.chord.traditionalName).toBe('D diminished');
    expect(bassDegreeLabelFromVoiced(resolved.chord, windPitches, getInitialBorrowingState())).toBe(
      '5th'
    );
  });

  it('Fire pitched up keeps bass one or two semitones below Twin Branch', () => {
    const { chord: twinBranch, voicing } = voicedPreviousChord(
      manager,
      'Twin Branch'
    );
    const pitched = resolveSmoothPlaybackTilt('Fire', PITCH_UP_ONE);
    const resolved = resolveElementalForNavigation(
      manager.getChordByName('Fire')!,
      TONAL_CENTER,
      OCTAVE_RANGE,
      twinBranch,
      previousBassMidi(voicing),
      pitched,
      'contrary'
    );
    const pitches = elementalVoicedPitches(resolved, pitched);
    const delta = previousBassMidi(voicing)! - Math.min(...pitches);
    expect(delta).toBeGreaterThanOrEqual(1);
    expect(delta).toBeLessThanOrEqual(2);
    expect(resolved.rootPitchClass).not.toBe(
      resolveDeterministicElementalPlayback(
        manager.getChordByName('Fire')!,
        TONAL_CENTER,
        OCTAVE_RANGE
      ).rootPitchClass
    );
  });
});

describe('smooth mode elemental determinism', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
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

describe('default elemental without opposite navigation', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
  });

  it('Branch -> Wind keeps default D diminished at flat', () => {
    const { chord: branch, voicing } = voicedPreviousChord(manager, 'Branch');
    const windTilt = resolveSmoothPlaybackTilt('Wind', DOUBLE_OCTAVE_FLAT);
    const resolved = resolveElementalForNavigation(
      manager.getChordByName('Wind')!,
      TONAL_CENTER,
      OCTAVE_RANGE,
      branch,
      previousBassMidi(voicing),
      windTilt,
      'contrary'
    );
    expect(resolved.chord.traditionalName).toBe('D diminished');
  });
});
