import { describe, it, expect } from 'vitest';
import {
  computePlayfieldBounds,
  computeOrbRadius,
  createInitialOrbStates,
  stepOrbPhysics,
  DEFAULT_ORB_PHYSICS_CONFIG,
  type OrbState,
} from './orbPhysics';

// Physics helpers are pure; tests cover rectangular bounds and tilt-driven motion.
describe('computePlayfieldBounds', () => {
  it('uses full container width and height', () => {
    expect(computePlayfieldBounds({ width: 390, height: 620 })).toEqual({
      width: 390,
      height: 620,
    });
  });

  it('clamps negative dimensions to zero', () => {
    expect(computePlayfieldBounds({ width: -10, height: 100 })).toEqual({
      width: 0,
      height: 100,
    });
  });
});

describe('computeOrbRadius', () => {
  it('derives radius from the shorter panel dimension', () => {
    expect(computeOrbRadius({ width: 400, height: 700 })).toBe(80);
  });
});

describe('createInitialOrbStates', () => {
  it('places orbs inside the playfield with spread anchors', () => {
    const bounds = { width: 400, height: 600 };
    const radius = computeOrbRadius(bounds);
    const orbs = createInitialOrbStates(bounds, 3);

    expect(orbs).toHaveLength(3);
    for (const orb of orbs) {
      expect(orb.x).toBeGreaterThanOrEqual(radius);
      expect(orb.x).toBeLessThanOrEqual(bounds.width - radius);
      expect(orb.y).toBeGreaterThanOrEqual(radius);
      expect(orb.y).toBeLessThanOrEqual(bounds.height - radius);
    }
  });
});

describe('stepOrbPhysics', () => {
  it('applies tilt gravity to velocity', () => {
    const bounds = { width: 400, height: 400 };
    const orbs: OrbState[] = [
      { x: 200, y: 200, vx: 0, vy: 0 },
    ];

    stepOrbPhysics(orbs, bounds, 45, 0, DEFAULT_ORB_PHYSICS_CONFIG);

    expect(orbs[0].vx).toBeGreaterThan(0);
    expect(orbs[0].vy).toBe(0);
  });

  it('bounces off rectangular walls using width and height independently', () => {
    const bounds = { width: 300, height: 500 };
    const radius = computeOrbRadius(bounds);
    const orbs: OrbState[] = [
      {
        x: bounds.width - radius + 5,
        y: bounds.height - radius + 5,
        vx: 4,
        vy: 6,
      },
    ];

    stepOrbPhysics(orbs, bounds, 0, 0, DEFAULT_ORB_PHYSICS_CONFIG);

    expect(orbs[0].x).toBeLessThanOrEqual(bounds.width - radius);
    expect(orbs[0].y).toBeLessThanOrEqual(bounds.height - radius);
    expect(orbs[0].vx).toBeLessThan(0);
    expect(orbs[0].vy).toBeLessThan(0);
  });

  it('respects portrait rectangle X limits as width not height', () => {
    const bounds = { width: 280, height: 520 };
    const radius = computeOrbRadius(bounds);
    const orbs: OrbState[] = [
      { x: radius - 1, y: 260, vx: -3, vy: 0 },
    ];

    stepOrbPhysics(orbs, bounds, 0, 0, DEFAULT_ORB_PHYSICS_CONFIG);

    expect(orbs[0].x).toBeGreaterThanOrEqual(radius);
    expect(orbs[0].x).toBeLessThan(bounds.width);
    expect(orbs[0].y).toBeLessThan(bounds.height);
  });
});
