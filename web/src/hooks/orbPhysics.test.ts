import { describe, it, expect } from 'vitest';
import {
  computeBubbleLevelTarget,
  stepBubbleLevelOffset,
  DEFAULT_BUBBLE_LEVEL_CONFIG,
  ORB_OVERSHOOT_FRACTION,
  ORB_TRAVEL_SCALE,
  ORB_PHYSICS_IDLE_FRAMES,
  ORIENTATION_ANGLE_NORMALIZER,
  isOrientationContinuous,
  nextOrbIdleFrames,
  shouldSleepOrbPhysics,
} from './orbPhysics';

describe('isOrientationContinuous', () => {
  it('accepts continuous small roll steps', () => {
    expect(
      isOrientationContinuous({ gamma: 10, beta: 0 }, { gamma: 20, beta: 0 }),
    ).toBe(true);
  });

  it('accepts small noise', () => {
    expect(
      isOrientationContinuous({ gamma: 40, beta: 15 }, { gamma: 45, beta: 12 }),
    ).toBe(true);
  });

  it('rejects gamma wraparound near ±90', () => {
    expect(
      isOrientationContinuous({ gamma: 85, beta: 0 }, { gamma: -85, beta: 0 }),
    ).toBe(false);
  });

  it('rejects large beta flips', () => {
    expect(
      isOrientationContinuous({ gamma: 0, beta: 10 }, { gamma: 0, beta: 170 }),
    ).toBe(false);
  });
});

describe('computeBubbleLevelTarget', () => {
  const bounds = { width: 400, height: 600 };
  const orbDiameter = 120;
  const travelX =
    (bounds.width / 2 + orbDiameter * ORB_OVERSHOOT_FRACTION) * ORB_TRAVEL_SCALE;
  const travelY =
    (bounds.height / 2 + orbDiameter * ORB_OVERSHOOT_FRACTION) * ORB_TRAVEL_SCALE;

  it('centers the bubble when the device is flat', () => {
    expect(computeBubbleLevelTarget(0, 0, bounds, orbDiameter)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('moves right for positive gamma (toward lowered edge)', () => {
    const target = computeBubbleLevelTarget(45, 0, bounds, orbDiameter);
    expect(target.x).toBeCloseTo(0.5 * travelX, 5);
    expect(target.y).toBe(0);
  });

  it('moves down for positive beta (toward lowered edge)', () => {
    const target = computeBubbleLevelTarget(0, 45, bounds, orbDiameter);
    expect(target.x).toBe(0);
    expect(target.y).toBeCloseTo(0.5 * travelY, 5);
  });

  it('saturates at ORB_TRAVEL_SCALE of half panel plus overshoot orb diameter', () => {
    const target = computeBubbleLevelTarget(
      ORIENTATION_ANGLE_NORMALIZER,
      -ORIENTATION_ANGLE_NORMALIZER,
      bounds,
      orbDiameter,
    );
    expect(target.x).toBeCloseTo(travelX, 5);
    expect(target.y).toBeCloseTo(-travelY, 5);
    expect(ORB_TRAVEL_SCALE).toBe(0.75);
  });

  it('returns origin for empty bounds', () => {
    expect(
      computeBubbleLevelTarget(30, 20, { width: 0, height: 100 }, orbDiameter),
    ).toEqual({ x: 0, y: 0 });
  });
});

describe('stepBubbleLevelOffset', () => {
  it('approaches the target without overshooting', () => {
    let current = { x: 0, y: 0 };
    const target = { x: 100, y: -50 };

    for (let i = 0; i < 40; i += 1) {
      const next = stepBubbleLevelOffset(current, target);
      expect(Math.abs(next.x)).toBeLessThanOrEqual(Math.abs(target.x) + 0.01);
      expect(Math.abs(next.y)).toBeLessThanOrEqual(Math.abs(target.y) + 0.01);
      current = next;
    }

    expect(current.x).toBeCloseTo(target.x, 0);
    expect(current.y).toBeCloseTo(target.y, 0);
  });

  it('moves a measurable step toward the target each frame', () => {
    const current = { x: 0, y: 0 };
    const target = { x: 80, y: 0 };
    const next = stepBubbleLevelOffset(current, target);
    expect(next.x).toBeCloseTo(80 * DEFAULT_BUBBLE_LEVEL_CONFIG.spring, 5);
    expect(next.y).toBe(0);
  });
});

describe('orb physics idle sleep helpers', () => {
  it('increments idle frames only when flat, centered, and unchanged', () => {
    expect(
      nextOrbIdleFrames(5, {
        tiltChanged: false,
        flatDevice: true,
        nearCenter: true,
      }),
    ).toBe(6);
    expect(
      nextOrbIdleFrames(5, {
        tiltChanged: true,
        flatDevice: true,
        nearCenter: true,
      }),
    ).toBe(0);
  });

  it('sleeps after ORB_PHYSICS_IDLE_FRAMES idle frames', () => {
    expect(shouldSleepOrbPhysics(ORB_PHYSICS_IDLE_FRAMES - 1)).toBe(false);
    expect(shouldSleepOrbPhysics(ORB_PHYSICS_IDLE_FRAMES)).toBe(true);
  });
});
