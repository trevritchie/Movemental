import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import { getInitialBorrowingState } from './BorrowingLogic';
import {
  previousBassMidi,
  resolveElementalForNavigation,
} from './elementalRoot';
import { resolveSmoothPlaybackTilt } from './predeterminedVoiceLeading';
import {
  parallelLevelFromTilt,
  tiltSampleFromLevels,
} from './TiltVoicingEngine';
import { computeTiltVoicedPitches } from './tiltVoicingPlayback';
import {
  bassDegreeLabelFromVoiced,
  tiltBassDegreeLabel,
  type TiltBassLabelContext,
} from './voiceDegreeLabel';
import { invalidateVoicingCache } from './voicingCache';

const TONAL_CENTER = 10;
const OCTAVE_RANGE = 2;
const DOUBLE_OCTAVE_FLAT = tiltSampleFromLevels(8, 0);

function smoothWindTiltAfterGlass(
  glassCommittedTilt: ReturnType<typeof resolveSmoothPlaybackTilt>
): ReturnType<typeof tiltSampleFromLevels> {
  const preservedParallel = parallelLevelFromTilt(glassCommittedTilt);
  return tiltSampleFromLevels(8, preservedParallel);
}

describe('Glass -> Wind opposite navigation', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
    manager.setOctaveRange(OCTAVE_RANGE);
    invalidateVoicingCache();
  });

  it('preserves Glass parallel so Wind sounds and labels 5th in bass', () => {
    const state = getInitialBorrowingState();
    const glass = manager.getChordByName('Glass')!;
    const wind = manager.getChordByName('Wind')!;
    const glassTilt = resolveSmoothPlaybackTilt('Glass', DOUBLE_OCTAVE_FLAT);
    const glassVoicing = computeTiltVoicedPitches(
      glass,
      state,
      glassTilt,
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary' }
    );

    expect(bassDegreeLabelFromVoiced(glass, glassVoicing, state)).toBe('5th');

    const windTilt = smoothWindTiltAfterGlass(glassTilt);
    expect(parallelLevelFromTilt(windTilt)).toBe(-2);

    const resolved = resolveElementalForNavigation(
      wind,
      TONAL_CENTER,
      OCTAVE_RANGE,
      glass,
      previousBassMidi(glassVoicing),
      windTilt,
      'contrary'
    );
    const windVoicing = computeTiltVoicedPitches(
      resolved.chord,
      state,
      windTilt,
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

    expect(resolved.chord.traditionalName).toBe('D diminished');
    expect(bassDegreeLabelFromVoiced(resolved.chord, windVoicing, state)).toBe(
      '5th'
    );

    const context: TiltBassLabelContext = {
      tonalCenter: TONAL_CENTER,
      octaveRange: OCTAVE_RANGE,
      borrowingState: state,
      playStyle: 'tilt',
      voiceLeadingMode: 'smooth',
      previousChord: glass,
      activePitches: windVoicing,
      elemental: {
        rootPitchClass: resolved.rootPitchClass,
        homeMidi: resolved.homeMidi,
      },
    };
    expect(tiltBassDegreeLabel(DOUBLE_OCTAVE_FLAT, resolved.chord, context)).toBe(
      '5th'
    );
  });

  it('uses Wind table parallel for non-opposite navigation', () => {
    const branch = manager.getChordByName('Branch')!;
    const wind = manager.getChordByName('Wind')!;
    const state = getInitialBorrowingState();
    const branchVoicing = computeTiltVoicedPitches(
      branch,
      state,
      resolveSmoothPlaybackTilt('Branch', DOUBLE_OCTAVE_FLAT),
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary' }
    );
    const windTilt = resolveSmoothPlaybackTilt('Wind', DOUBLE_OCTAVE_FLAT);
    expect(parallelLevelFromTilt(windTilt)).toBe(-1);
    const resolved = resolveElementalForNavigation(
      wind,
      TONAL_CENTER,
      OCTAVE_RANGE,
      branch,
      previousBassMidi(branchVoicing),
      windTilt,
      'contrary'
    );
    const windVoicing = computeTiltVoicedPitches(
      resolved.chord,
      state,
      windTilt,
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
    expect(resolved.chord.traditionalName).toBe('D diminished');
    expect(bassDegreeLabelFromVoiced(resolved.chord, windVoicing, state)).toBe(
      '6th'
    );
  });
});
