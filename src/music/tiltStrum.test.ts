import { describe, expect, it } from 'vitest';
import {
  resolveStrumPlaybackTilt,
  strumLevelsChanged,
  strumMinIntervalMs,
  strumRateLimitAllows,
} from './tiltStrum';
import {
  mapTiltToPositions,
  parallelLevelFromTilt,
  type TiltSample,
} from './TiltVoicingEngine';

describe('tiltStrum', () => {
  it('computes min interval from BPM and shortest note', () => {
    expect(strumMinIntervalMs(120, '16n')).toBe(125);
    expect(strumMinIntervalMs(120, '8n')).toBe(250);
    expect(strumMinIntervalMs(120, '4n')).toBe(500);
    expect(strumMinIntervalMs(60, '16n')).toBe(250);
  });

  it('detects discrete level changes', () => {
    expect(
      strumLevelsChanged(
        { inputSteps: 4, parallelSteps: 0 },
        { inputSteps: 4, parallelSteps: 0 },
      ),
    ).toBe(false);
    expect(
      strumLevelsChanged(
        { inputSteps: 5, parallelSteps: 0 },
        { inputSteps: 4, parallelSteps: 0 },
      ),
    ).toBe(true);
    expect(
      strumLevelsChanged({ inputSteps: 4, parallelSteps: 1 }, null),
    ).toBe(true);
  });

  it('enforces the strum rate limit', () => {
    expect(strumRateLimitAllows(200, 100, 125)).toBe(false);
    expect(strumRateLimitAllows(225, 100, 125)).toBe(true);
  });

  it('preserves committed parallel and applies live pitch delta', () => {
    const lastControl: TiltSample = { x: -0.5, y: 0 };
    const lastCommitted: TiltSample = { x: -0.5, y: 0 };
    const live: TiltSample = { x: -0.25, y: -0.5 };
    const result = resolveStrumPlaybackTilt(live, lastControl, lastCommitted);
    const liveLevels = mapTiltToPositions(live);
    const pitchDelta =
      parallelLevelFromTilt(live) - parallelLevelFromTilt(lastControl);
    expect(mapTiltToPositions(result).inputSteps).toBe(liveLevels.inputSteps);
    expect(parallelLevelFromTilt(result)).toBe(
      parallelLevelFromTilt(lastCommitted) + pitchDelta,
    );
  });
});
