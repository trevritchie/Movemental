import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import {
  resolveSmoothOppositeElementTilt,
  resolveSmoothPlaybackTiltForNavigation,
  resolveSmoothNoTiltPlaybackTiltForNavigation,
} from './playbackTiltResolution';
import { resolveSmoothPlaybackTilt } from './predeterminedVoiceLeading';
import {
  parallelLevelFromTilt,
  tiltSampleFromLevels,
  DEFAULT_NO_TILT_VOICING_LEVEL,
} from './TiltVoicingEngine';

describe('resolveSmoothOppositeElementTilt', () => {
  const FLAT = tiltSampleFromLevels(8, 0);
  const GLASS_COMMITTED = resolveSmoothPlaybackTilt('Glass', FLAT);

  it('preserves committed parallel at unchanged control tilt', () => {
    const result = resolveSmoothOppositeElementTilt(
      FLAT,
      FLAT,
      GLASS_COMMITTED
    );
    expect(parallelLevelFromTilt(result)).toBe(-2);
  });

  it('applies pitch delta since last control tilt', () => {
    const PITCH_DOWN = { x: 0, y: 0.25 };
    const result = resolveSmoothOppositeElementTilt(
      PITCH_DOWN,
      FLAT,
      GLASS_COMMITTED
    );
    expect(parallelLevelFromTilt(result)).toBe(-3);
  });
});

describe('resolveSmoothPlaybackTiltForNavigation to Wind', () => {
  let manager: ChordManager;
  const FLAT = tiltSampleFromLevels(8, 0);
  const COMMITTED_FLAT = FLAT;

  beforeEach(() => {
    manager = new ChordManager();
  });

  it('uses 6th baseline from Branch (Earth-Wind edge)', () => {
    const branch = manager.getChordByName('Branch')!;
    const wind = manager.getChordByName('Wind')!;
    const result = resolveSmoothPlaybackTiltForNavigation(
      wind,
      FLAT,
      true,
      branch,
      FLAT,
      COMMITTED_FLAT
    );
    expect(parallelLevelFromTilt(result)).toBe(-1);
  });

  it('uses 6th baseline from Smoke (Wind-Fire edge)', () => {
    const smoke = manager.getChordByName('Smoke')!;
    const wind = manager.getChordByName('Wind')!;
    const result = resolveSmoothPlaybackTiltForNavigation(
      wind,
      FLAT,
      true,
      smoke,
      FLAT,
      COMMITTED_FLAT
    );
    expect(parallelLevelFromTilt(result)).toBe(-1);
  });

  it('uses 5th default from Fire corner', () => {
    const fire = manager.getChordByName('Fire')!;
    const wind = manager.getChordByName('Wind')!;
    const result = resolveSmoothPlaybackTiltForNavigation(
      wind,
      FLAT,
      true,
      fire,
      FLAT,
      COMMITTED_FLAT
    );
    expect(parallelLevelFromTilt(result)).toBe(-2);
  });

  it('preserves Glass committed parallel for opposite navigation', () => {
    const glass = manager.getChordByName('Glass')!;
    const wind = manager.getChordByName('Wind')!;
    const glassCommitted = resolveSmoothPlaybackTilt('Glass', FLAT);
    const result = resolveSmoothPlaybackTiltForNavigation(
      wind,
      FLAT,
      true,
      glass,
      FLAT,
      glassCommitted
    );
    expect(parallelLevelFromTilt(result)).toBe(-2);
  });
});

describe('resolveSmoothNoTiltPlaybackTiltForNavigation to Wind', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
  });

  it('uses 6th baseline from Branch (Earth-Wind edge)', () => {
    const branch = manager.getChordByName('Branch')!;
    const wind = manager.getChordByName('Wind')!;
    const tilt = resolveSmoothNoTiltPlaybackTiltForNavigation(
      wind,
      DEFAULT_NO_TILT_VOICING_LEVEL,
      true,
      branch,
      false,
      0
    );
    expect(parallelLevelFromTilt(tilt)).toBe(-1);
  });

  it('uses 5th default from Fire corner', () => {
    const fire = manager.getChordByName('Fire')!;
    const wind = manager.getChordByName('Wind')!;
    const tilt = resolveSmoothNoTiltPlaybackTiltForNavigation(
      wind,
      DEFAULT_NO_TILT_VOICING_LEVEL,
      true,
      fire,
      false,
      0
    );
    expect(parallelLevelFromTilt(tilt)).toBe(-2);
  });
});
