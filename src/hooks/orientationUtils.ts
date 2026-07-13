/**
 * Shared device-orientation helpers for voicing tilt and orb physics.
 */

/** Device orientation angles are normalized by this span (see useDeviceTilt). */
export const ORIENTATION_ANGLE_NORMALIZER = 90;

/** Reject Euler wraparound jumps larger than this (degrees). */
export const ORIENTATION_JUMP_THRESHOLD_DEG = 100;

export interface OrientationSample {
  gamma: number;
  beta: number;
}

/**
 * True when consecutive deviceorientation samples are continuous.
 * Large deltas mean gamma/beta wrapped at a Euler singularity (±90° roll).
 */
export function isOrientationContinuous(
  previous: OrientationSample,
  next: OrientationSample,
  threshold = ORIENTATION_JUMP_THRESHOLD_DEG,
): boolean {
  return (
    Math.abs(next.gamma - previous.gamma) <= threshold &&
    Math.abs(next.beta - previous.beta) <= threshold
  );
}
