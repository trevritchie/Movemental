/**
 * Pure helpers for diagram background orb physics (tilt mode).
 *
 * Models three independent balls rolling inside the full diagram panel rectangle.
 * Gravity comes from raw device angles (gamma = roll, beta = pitch), not from
 * normalized TiltSample (which uses |gamma| for voicing and loses roll direction).
 *
 * Tuning: adjust DEFAULT_ORB_PHYSICS_CONFIG for gravity, friction, and bounce feel.
 */
export interface PlayfieldBounds {
  width: number;
  height: number;
}

export interface OrbState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface OrbPhysicsConfig {
  gravityStrength: number;
  friction: number;
  restitution: number;
  bounceDamping: number;
}

/** Tweak these constants to change maze-ball roll speed and bounce character. */
export const DEFAULT_ORB_PHYSICS_CONFIG: OrbPhysicsConfig = {
  gravityStrength: 0.12,
  friction: 0.985,
  restitution: 0.55,
  bounceDamping: 0.92,
};

/** Matches CSS `40cqmin` orb diameter in physics mode (2 × ORB_RADIUS_RATIO). */
const ORB_RADIUS_RATIO = 0.2;

/** Uses the full container rectangle; X and Y limits are independent. */
export function computePlayfieldBounds(rect: {
  width: number;
  height: number;
}): PlayfieldBounds {
  return {
    width: Math.max(rect.width, 0),
    height: Math.max(rect.height, 0),
  };
}

export function computeOrbRadius(bounds: PlayfieldBounds): number {
  const minDim = Math.min(bounds.width, bounds.height);
  return minDim > 0 ? minDim * ORB_RADIUS_RATIO : 0;
}

export function createInitialOrbStates(
  bounds: PlayfieldBounds,
  count: number,
): OrbState[] {
  const radius = computeOrbRadius(bounds);
  const inset = radius;
  const usableW = Math.max(bounds.width - inset * 2, 0);
  const usableH = Math.max(bounds.height - inset * 2, 0);

  const anchors = [
    // Spread starting positions so all three orbs are visible at session start.
    { x: 0.22, y: 0.28 },
    { x: 0.72, y: 0.32 },
    { x: 0.48, y: 0.72 },
  ];

  return Array.from({ length: count }, (_, i) => {
    const anchor = anchors[i % anchors.length];
    return {
      x: inset + usableW * anchor.x,
      y: inset + usableH * anchor.y,
      vx: 0,
      vy: 0,
    };
  });
}

export function stepOrbPhysics(
  orbs: OrbState[],
  bounds: PlayfieldBounds,
  gamma: number,
  beta: number,
  config: OrbPhysicsConfig = DEFAULT_ORB_PHYSICS_CONFIG,
): void {
  const radius = computeOrbRadius(bounds);
  if (bounds.width <= 0 || bounds.height <= 0 || radius <= 0) return;

  // DeviceOrientation angles: gamma tilts left/right, beta tilts toward/away from user.
  const ax = (gamma / 90) * config.gravityStrength;
  const ay = (beta / 90) * config.gravityStrength;

  for (const orb of orbs) {
    orb.vx = (orb.vx + ax) * config.friction;
    orb.vy = (orb.vy + ay) * config.friction;
    orb.x += orb.vx;
    orb.y += orb.vy;

    const minX = radius;
    const maxX = bounds.width - radius;
    const minY = radius;
    const maxY = bounds.height - radius;

    if (orb.x < minX) {
      orb.x = minX;
      orb.vx = -orb.vx * config.restitution * config.bounceDamping;
    } else if (orb.x > maxX) {
      orb.x = maxX;
      orb.vx = -orb.vx * config.restitution * config.bounceDamping;
    }

    if (orb.y < minY) {
      orb.y = minY;
      orb.vy = -orb.vy * config.restitution * config.bounceDamping;
    } else if (orb.y > maxY) {
      orb.y = maxY;
      orb.vy = -orb.vy * config.restitution * config.bounceDamping;
    }
  }
}
