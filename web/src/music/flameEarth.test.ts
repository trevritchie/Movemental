import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import { getInitialBorrowingState } from './BorrowingLogic';
import {
  previousBassMidi,
  resolveElementalForNavigation,
} from './elementalRoot';
import {
  resolveSmoothOppositeElementTilt,
  resolveSmoothPlaybackTiltForNavigation,
} from './playbackTiltResolution';
import { resolveSmoothPlaybackTilt } from './predeterminedVoiceLeading';
import {
  parallelLevelFromTilt,
  tiltSampleFromLevels,
} from './TiltVoicingEngine';
import { computeTiltVoicedPitches } from './tiltVoicingPlayback';
import { bassDegreeLabelFromVoiced } from './voiceDegreeLabel';

const TONAL_CENTER = 10;
const OCTAVE_RANGE = 2;
const FLAT = tiltSampleFromLevels(8, 0);
const PITCH_DOWN = { x: 0, y: 0.25 };

describe('Flame -> Earth opposite navigation', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
    manager.setOctaveRange(OCTAVE_RANGE);
  });

  it('places Earth bass one or two semitones below Flame at unchanged tilt', () => {
    const state = getInitialBorrowingState();
    const flame = manager.getChordByName('Flame')!;
    const earth = manager.getChordByName('Earth')!;
    const flameTilt = resolveSmoothPlaybackTilt('Flame', FLAT);
    const flameVoicing = computeTiltVoicedPitches(
      flame,
      state,
      flameTilt,
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary' }
    );
    expect(bassDegreeLabelFromVoiced(flame, flameVoicing, state)).toBe('5th');

    const earthTilt = resolveSmoothOppositeElementTilt(
      FLAT,
      FLAT,
      flameTilt
    );
    expect(parallelLevelFromTilt(earthTilt)).toBe(-2);

    const resolved = resolveElementalForNavigation(
      earth,
      TONAL_CENTER,
      OCTAVE_RANGE,
      flame,
      previousBassMidi(flameVoicing),
      earthTilt,
      'contrary'
    );
    const earthVoicing = computeTiltVoicedPitches(
      resolved.chord,
      state,
      earthTilt,
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

    const flameBass = previousBassMidi(flameVoicing)!;
    const earthBass = Math.min(...earthVoicing);
    const delta = flameBass - earthBass;
    expect(delta).toBeGreaterThanOrEqual(1);
    expect(delta).toBeLessThanOrEqual(2);
  });

  it('applies pitch delta between Flame tap and Earth tap', () => {
    const state = getInitialBorrowingState();
    const flame = manager.getChordByName('Flame')!;
    const earth = manager.getChordByName('Earth')!;
    const flameTilt = resolveSmoothPlaybackTilt('Flame', FLAT);
    const flameVoicing = computeTiltVoicedPitches(
      flame,
      state,
      flameTilt,
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary' }
    );

    const flatEarthTilt = resolveSmoothPlaybackTiltForNavigation(
      earth,
      FLAT,
      true,
      flame,
      FLAT,
      flameTilt
    );
    const pitchedEarthTilt = resolveSmoothPlaybackTiltForNavigation(
      earth,
      PITCH_DOWN,
      true,
      flame,
      FLAT,
      flameTilt
    );
    expect(parallelLevelFromTilt(flatEarthTilt)).toBe(-2);
    expect(parallelLevelFromTilt(pitchedEarthTilt)).toBe(-3);

    const flatResolved = resolveElementalForNavigation(
      earth,
      TONAL_CENTER,
      OCTAVE_RANGE,
      flame,
      previousBassMidi(flameVoicing),
      flatEarthTilt,
      'contrary'
    );
    const pitchedResolved = resolveElementalForNavigation(
      earth,
      TONAL_CENTER,
      OCTAVE_RANGE,
      flame,
      previousBassMidi(flameVoicing),
      pitchedEarthTilt,
      'contrary'
    );
    const flatBass = Math.min(
      ...computeTiltVoicedPitches(
        flatResolved.chord,
        state,
        flatEarthTilt,
        TONAL_CENTER,
        OCTAVE_RANGE,
        {
          anchor: 'contrary',
          elemental: {
            rootPitchClass: flatResolved.rootPitchClass,
            homeMidi: flatResolved.homeMidi,
          },
        }
      )
    );
    const pitchedBass = Math.min(
      ...computeTiltVoicedPitches(
        pitchedResolved.chord,
        state,
        pitchedEarthTilt,
        TONAL_CENTER,
        OCTAVE_RANGE,
        {
          anchor: 'contrary',
          elemental: {
            rootPitchClass: pitchedResolved.rootPitchClass,
            homeMidi: pitchedResolved.homeMidi,
          },
        }
      )
    );
    const flameBass = previousBassMidi(flameVoicing)!;
    for (const bass of [flatBass, pitchedBass]) {
      const delta = flameBass - bass;
      expect(delta).toBeGreaterThanOrEqual(1);
      expect(delta).toBeLessThanOrEqual(2);
    }
    expect(pitchedEarthTilt.y).not.toBe(flatEarthTilt.y);
  });

  it('Twin Flame narrow roll with F#3 bass lands Earth 1-2 semitones below', () => {
    const state = getInitialBorrowingState();
    const twinFlame = manager.getChordByName('Twin Flame')!;
    const earth = manager.getChordByName('Earth')!;
    const twinFlameTilt = tiltSampleFromLevels(0, -2);
    const twinFlameVoicing = computeTiltVoicedPitches(
      twinFlame,
      state,
      twinFlameTilt,
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary' }
    );
    expect(Math.min(...twinFlameVoicing)).toBe(54);

    const committedTilt = resolveSmoothPlaybackTilt('Twin Flame', twinFlameTilt);
    const earthTilt = resolveSmoothPlaybackTiltForNavigation(
      earth,
      twinFlameTilt,
      true,
      twinFlame,
      twinFlameTilt,
      committedTilt
    );
    const resolved = resolveElementalForNavigation(
      earth,
      TONAL_CENTER,
      OCTAVE_RANGE,
      twinFlame,
      previousBassMidi(twinFlameVoicing),
      earthTilt,
      'contrary'
    );
    const earthVoicing = computeTiltVoicedPitches(
      resolved.chord,
      state,
      earthTilt,
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
    const delta = previousBassMidi(twinFlameVoicing)! - Math.min(...earthVoicing);
    expect(delta).toBeGreaterThanOrEqual(1);
    expect(delta).toBeLessThanOrEqual(2);
    expect(Math.min(...earthVoicing)).not.toBe(58);
  });

  it('Flame 7th in bass at parallel -1 lands Earth 1-2 semitones below', () => {
    const state = getInitialBorrowingState();
    const flame = manager.getChordByName('Flame')!;
    const earth = manager.getChordByName('Earth')!;
    const flameTilt = tiltSampleFromLevels(8, -1);
    const flameVoicing = computeTiltVoicedPitches(
      flame,
      state,
      flameTilt,
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary' }
    );
    const committedTilt = resolveSmoothPlaybackTilt('Flame', flameTilt);
    const earthTilt = resolveSmoothPlaybackTiltForNavigation(
      earth,
      flameTilt,
      true,
      flame,
      flameTilt,
      committedTilt
    );
    const resolved = resolveElementalForNavigation(
      earth,
      TONAL_CENTER,
      OCTAVE_RANGE,
      flame,
      previousBassMidi(flameVoicing),
      earthTilt,
      'contrary'
    );
    const earthVoicing = computeTiltVoicedPitches(
      resolved.chord,
      state,
      earthTilt,
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
    const delta = previousBassMidi(flameVoicing)! - Math.min(...earthVoicing);
    expect(delta).toBeGreaterThanOrEqual(1);
    expect(delta).toBeLessThanOrEqual(2);
  });
});
