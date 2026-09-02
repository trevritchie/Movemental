import { describe, expect, it } from 'vitest';
import {
  resolveStrumPlaybackTilt,
  strumLevelsChanged,
  strumLevelsFromTilt,
  strumMinIntervalMs,
  strumRateLimitAllows,
  strumSnapFromTilt,
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

  it('reuses a precomputed snap when resolving strum playback tilt', () => {
    const live: TiltSample = { x: -0.75, y: 0 };
    const flat: TiltSample = { x: 0, y: 0 };
    const { snapped, levels } = strumSnapFromTilt(
      live,
      'every_other',
      'Branch',
    );
    const result = resolveStrumPlaybackTilt(
      live,
      flat,
      flat,
      'every_other',
      'Branch',
      { snapped, inputSteps: levels.inputSteps },
    );
    expect(levels.inputSteps).toBe(2);
    expect(mapTiltToPositions(result).inputSteps).toBe(2);
  });

  it('gates strum levels through Every Other floors for children', () => {
    // Two samples inside the lowest Every Other child stop (Unison).
    const nearVertical = strumLevelsFromTilt(
      { x: -1, y: 0 },
      'every_other',
      'Branch',
    );
    const stillUnison = strumLevelsFromTilt(
      { x: -0.9, y: 0 },
      'every_other',
      'Branch',
    );
    expect(nearVertical.inputSteps).toBe(0);
    expect(stillUnison.inputSteps).toBe(0);
    expect(strumLevelsChanged(stillUnison, nearVertical)).toBe(false);

    // Next Every Other stop is Triad (skips All-mode Third).
    const triad = strumLevelsFromTilt(
      { x: -0.75, y: 0 },
      'every_other',
      'Branch',
    );
    expect(triad.inputSteps).toBe(2);
    expect(strumLevelsChanged(triad, nearVertical)).toBe(true);
  });

  it('resolves strum playback roll through Every Other parent floors', () => {
    const live: TiltSample = { x: -0.75, y: 0 };
    const flat: TiltSample = { x: 0, y: 0 };
    const result = resolveStrumPlaybackTilt(
      live,
      flat,
      flat,
      'every_other',
      'Earth',
    );
    // Stop index 1 for parents is still Third (duplicated lowest floors).
    expect(mapTiltToPositions(result).inputSteps).toBe(1);
  });
});
