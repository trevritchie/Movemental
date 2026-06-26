import { describe, it, expect } from 'vitest';
import { ChordManager } from './ChordManager';
import { getInitialBorrowingState } from './BorrowingLogic';
import { resolveSmoothModeParallelSteps, resolveSmoothPlaybackTilt } from './predeterminedVoiceLeading';
import {
  FLAT_TILT,
  parallelLevelFromTilt,
  resolvePlaybackTiltWithFlatBaseline,
} from './TiltVoicingEngine';
import { tiltBassDegreeLabel, type TiltBassLabelContext } from './voiceDegreeLabel';

const PITCH_UP_ONE = { x: 0, y: -0.25 };
const PITCH_DOWN_ONE = { x: 0, y: 0.25 };

function smoothContext(): TiltBassLabelContext {
  return {
    tonalCenter: 0,
    octaveRange: 3,
    borrowingState: getInitialBorrowingState(),
    tiltModeEnabled: true,
    voiceLeadingMode: 'smooth',
    smoothBaseParallel: 0,
    lastTapTilt: FLAT_TILT,
  };
}

describe('resolveSmoothModeParallelSteps', () => {
  it('matches root position when Branch flat baseline is 0', () => {
    const pitched = PITCH_UP_ONE;
    expect(resolveSmoothModeParallelSteps('Branch', pitched)).toBe(
      parallelLevelFromTilt(pitched)
    );
    expect(resolveSmoothPlaybackTilt('Branch', pitched)).toEqual(
      resolvePlaybackTiltWithFlatBaseline(0, pitched)
    );
  });

  it('returns 0 for flat Branch at double octave', () => {
    expect(resolveSmoothModeParallelSteps('Branch', FLAT_TILT)).toBe(0);
  });

  it('adds pitch offset to chord flat baseline', () => {
    expect(resolveSmoothModeParallelSteps('Branch', PITCH_UP_ONE)).toBe(1);
    expect(resolveSmoothModeParallelSteps('Branch', PITCH_DOWN_ONE)).toBe(-1);
    expect(resolveSmoothModeParallelSteps('Flame', FLAT_TILT)).toBe(-2);
    expect(resolveSmoothModeParallelSteps('Flame', PITCH_UP_ONE)).toBe(-1);
  });

  it('is independent of navigation history', () => {
    const pitched = PITCH_UP_ONE;
    const direct = resolveSmoothModeParallelSteps('Branch', pitched);

    const afterFire = resolveSmoothModeParallelSteps('Fire', pitched);
    const returnBranch = resolveSmoothModeParallelSteps('Branch', pitched);

    expect(returnBranch).toBe(direct);
    expect(returnBranch).not.toBe(
      resolveSmoothModeParallelSteps('Branch', FLAT_TILT)
    );
    expect(afterFire).toBe(1);
  });

  it('never puts Branch flat at fifth baseline', () => {
    expect(resolveSmoothModeParallelSteps('Branch', FLAT_TILT)).not.toBe(-2);
    expect(parallelLevelFromTilt(FLAT_TILT)).toBe(0);
  });

  it('resolveSmoothPlaybackTilt preserves roll width', () => {
    const narrowRoll = { x: -0.25, y: 0 };
    const playback = resolveSmoothPlaybackTilt('Branch', narrowRoll);
    expect(parallelLevelFromTilt(playback)).toBe(0);
    expect(playback.x).toBe(narrowRoll.x);
  });
});

describe('smooth mode label determinism', () => {
  it('Branch pitched up shows same bass after simulated chord return', () => {
    const manager = new ChordManager();
    const branch = manager.getChordByName('Branch')!;
    const context = smoothContext();
    context.smoothBaseParallel = 0;
    context.lastTapTilt = PITCH_UP_ONE;

    const direct = tiltBassDegreeLabel(PITCH_UP_ONE, branch, context);
    expect(direct).toBe('\u2191 3rd');
    expect(direct).not.toBe('\u2191 Root');
  });

  it('flat Branch stays root even with stale session smoothBase', () => {
    const manager = new ChordManager();
    const branch = manager.getChordByName('Branch')!;
    const context = smoothContext();
    context.smoothBaseParallel = 99;
    context.lastTapTilt = PITCH_UP_ONE;

    expect(tiltBassDegreeLabel(FLAT_TILT, branch, context)).toBe('Root');
  });
});
