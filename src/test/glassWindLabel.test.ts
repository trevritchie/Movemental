import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from '../music/ChordManager';
import { getInitialBorrowingState } from '../music/BorrowingLogic';
import {
  previousBassMidi,
  resolveElementalForNavigation,
} from '../music/elementalRoot';
import { resolveSmoothPlaybackTilt } from '../music/predeterminedVoiceLeading';
import { resolveSmoothPlaybackTiltForNavigation } from '../music/playbackTiltResolution';
import {
  parallelLevelFromTilt,
  tiltSampleFromLevels,
} from '../music/TiltVoicingEngine';
import { computeTiltVoicedPitches } from '../music/tiltVoicingPlayback';
import {
  bassDegreeLabelFromVoiced,
  tiltBassDegreeLabel,
  type TiltBassLabelContext,
} from '../music/voiceDegreeLabel';
import { invalidateVoicingCache } from '../music/voicingCache';

const TONAL_CENTER = 10;
const OCTAVE_RANGE = 2;
// Flat double-octave roll at parallel 0 (smooth mode starting tilt).
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
      tiltModeEnabled: true,
      voiceLeadingMode: 'smooth',
      previousChord: glass,
      lastTapTilt: DOUBLE_OCTAVE_FLAT,
      lastCommittedPlaybackTilt: glassTilt,
      elemental: {
        rootPitchClass: resolved.rootPitchClass,
        homeMidi: resolved.homeMidi,
      },
    };
    expect(tiltBassDegreeLabel(DOUBLE_OCTAVE_FLAT, resolved.chord, context)).toBe(
      '5th'
    );
  });

  it('uses Earth-Wind axis baseline for Branch -> Wind', () => {
    const branch = manager.getChordByName('Branch')!;
    const wind = manager.getChordByName('Wind')!;
    const state = getInitialBorrowingState();
    const branchTilt = resolveSmoothPlaybackTilt('Branch', DOUBLE_OCTAVE_FLAT);
    const branchVoicing = computeTiltVoicedPitches(
      branch,
      state,
      branchTilt,
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary' }
    );
    const windTilt = resolveSmoothPlaybackTiltForNavigation(
      wind,
      DOUBLE_OCTAVE_FLAT,
      true,
      branch,
      DOUBLE_OCTAVE_FLAT,
      branchTilt
    );
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
