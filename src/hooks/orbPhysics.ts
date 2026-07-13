/**
 * Bubble-level helpers for diagram background orbs (tilt mode).
 *
 * Flat device → group offset at center (0, 0). Signed gamma/beta map to a
 * spring-smoothed offset so the swirling orb group slides with tilt (inverted
 * vs a real spirit level: toward the lowered edge).
 *
 * Max travel = ORB_TRAVEL_SCALE of (half panel + ORB_OVERSHOOT_FRACTION *
 * largest orb diameter) so glow may hang partly off-screen at extreme tilt
 * without going fully away.
 *
 * Orientation uses the same ~90° normalizer as voicing/bass tilt readouts.
 */
import { clamp } from '../utils/clamp';
import { ORIENTATION_ANGLE_NORMALIZER } from './orientationUtils';

export {
  ORIENTATION_ANGLE_NORMALIZER,
  ORIENTATION_JUMP_THRESHOLD_DEG,
  isOrientationContinuous,
  type OrientationSample,
} from './orientationUtils';

export interface PlayfieldBounds {
  width: number;
  height: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface BubbleLevelConfig {
  /** Per-frame lerp toward the target offset (0–1). */
  spring: number;
}

/** Fraction of orb diameter allowed past the panel edge in the full travel budget. */
export const ORB_OVERSHOOT_FRACTION = 0.75;

/** Scale applied to max travel (1 = full budget; 0.75 = 25% less range). */
export const ORB_TRAVEL_SCALE = 0.75;

/** Frames with no motion before physics cancels rAF (sleeps). */
export const ORB_PHYSICS_IDLE_FRAMES = 30;

/** Speed threshold (px/frame) for treating orbs as stationary. */
export const ORB_PHYSICS_IDLE_SPEED = 0.05;

/** Orientation magnitude below which tilt is treated as flat. */
export const ORB_PHYSICS_FLAT_TILT = 0.75;

/** Angle delta (degrees) treated as no orientation change. */
export const ORB_TILT_DELTA_EPS = 0.05;

export const DEFAULT_BUBBLE_LEVEL_CONFIG: BubbleLevelConfig = {
  spring: 0.14,
};

/** Fallback when glow-orb DOM size is not yet measured. */
export function fallbackOrbDiameter(bounds: PlayfieldBounds): number {
  return 0.7 * Math.min(bounds.width, bounds.height);
}

/**
 * Map signed device angles to a panel-centered offset (px from center).
 * Positive gamma (right side down) moves the group right (toward lowered edge).
 */
export function computeBubbleLevelTarget(
  gamma: number,
  beta: number,
  bounds: PlayfieldBounds,
  maxOrbDiameter: number,
): Point2D {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0 };
  }

  const orbDiameter =
    maxOrbDiameter > 0 ? maxOrbDiameter : fallbackOrbDiameter(bounds);
  const nx = clamp(gamma / ORIENTATION_ANGLE_NORMALIZER, -1, 1);
  const ny = clamp(beta / ORIENTATION_ANGLE_NORMALIZER, -1, 1);
  const travelX =
    (bounds.width / 2 + orbDiameter * ORB_OVERSHOOT_FRACTION) * ORB_TRAVEL_SCALE;
  const travelY =
    (bounds.height / 2 + orbDiameter * ORB_OVERSHOOT_FRACTION) * ORB_TRAVEL_SCALE;

  const x = nx * travelX;
  const y = ny * travelY;
  return {
    x: x === 0 ? 0 : x,
    y: y === 0 ? 0 : y,
  };
}

/** Spring-lerp current offset toward the bubble-level target. */
export function stepBubbleLevelOffset(
  current: Point2D,
  target: Point2D,
  config: BubbleLevelConfig = DEFAULT_BUBBLE_LEVEL_CONFIG,
): Point2D {
  const spring = clamp(config.spring, 0, 1);
  return {
    x: current.x + (target.x - current.x) * spring,
    y: current.y + (target.y - current.y) * spring,
  };
}

/** Advance idle-frame counter; reset when the device is moving or not flat. */
export function nextOrbIdleFrames(
  idleFrames: number,
  opts: { tiltChanged: boolean; flatDevice: boolean; nearCenter: boolean },
): number {
  if (!opts.tiltChanged && opts.flatDevice && opts.nearCenter) {
    return idleFrames + 1;
  }
  return 0;
}

/** True when the physics loop should cancel rAF and sleep. */
export function shouldSleepOrbPhysics(
  idleFrames: number,
  limit = ORB_PHYSICS_IDLE_FRAMES,
): boolean {
  return idleFrames >= limit;
}
