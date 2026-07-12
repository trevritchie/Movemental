/**
 * Device orientation for tilt voicing and diagram overlay readouts.
 *
 * Exposes smoothed tilt for UI (~150 ms) and raw tilt sampled at chord tap.
 * See docs/movements-not-chords-tilt.md for the coordinate mapping.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FLAT_TILT,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import { ORIENTATION_ANGLE_NORMALIZER, isOrientationContinuous } from './orbPhysics';

export type TiltStatus =
  | 'unsupported'
  | 'needs-permission'
  | 'denied'
  | 'active';

export interface OrientationAngles {
  gamma: number;
  beta: number;
}

// iOS exposes a static requestPermission on the event constructor.
interface PermissionedOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

const PITCH_NORMALIZER = ORIENTATION_ANGLE_NORMALIZER;
const SMOOTHING_ALPHA = 0.25; // exponential moving average weight per event
const READOUT_INTERVAL_MS = 150; // throttle for the React-visible sample

export const pitchTiltFromBeta = (beta: number): number => {
  const norm = beta / PITCH_NORMALIZER;
  if (norm > 0) return -Math.min(norm, 1);
  if (norm < 0) return Math.min(-norm, 1);
  return 0;
};

/**
 * Reads device orientation and exposes it as a normalized tilt sample in the
 * engine's coordinate space (see TiltVoicingEngine): x in [-1, 0], y in
 * [-1, 1], where 0 is flat on each axis.
 *
 * deviceorientation angles are used rather than devicemotion acceleration
 * because the angles are sign-consistent across browsers (iOS has a known
 * sign quirk in accelerationIncludingGravity).
 *
 * - x: roll magnitude (|gamma| / 90), so either roll direction narrows the
 *   voicing. Fully vertical maps to -1.
 * - y: chest-ward pitch (beta / 90, positive beta) maps to y in [-1, 0];
 *   away-from-chest (negative beta) maps to y in (0, 1], selecting lower
 *   ladder positions in reverse order (4th, 3rd, 2nd).
 *
 * Two tilt refs:
 * - tiltRef / React `tilt`: smoothed, throttled to ~150 ms for UI readouts
 * - rawTiltRef: unsmoothed angles for playback sampling at tap time
 * - orientationRef: smoothed gamma/beta for high-frequency visuals (bubble-level orbs).
 *   Unlike tiltRef.x, orientationRef keeps roll sign so the orb group can slide left/right.
 *   Visual samples are gated against Euler wraparound jumps near ±90° roll.
 */
export function useDeviceTilt() {
  /** Smoothed sample for diagram overlay readouts. */
  const tiltRef = useRef<TiltSample>({ ...FLAT_TILT });
  const smoothedRef = useRef({ gamma: 0, beta: 0 });
  /** Visual-only smoother; skips discontinuous Euler wrap samples. */
  const visualSmoothedRef = useRef({ gamma: 0, beta: 0 });
  const lastAcceptedVisualRawRef = useRef<{ gamma: number; beta: number } | null>(
    null,
  );
  /** Smoothed device angles for high-frequency visual effects (e.g. orb level). */
  const orientationRef = useRef<OrientationAngles>({ gamma: 0, beta: 0 });
  const lastReadoutRef = useRef(0);
  const rawTiltRef = useRef<TiltSample>({ ...FLAT_TILT });

  const [tilt, setTilt] = useState<TiltSample>({ ...FLAT_TILT });
  const [status, setStatus] = useState<TiltStatus>(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      return 'unsupported';
    }
    const ctor = window.DeviceOrientationEvent as unknown as PermissionedOrientationEvent;
    return typeof ctor.requestPermission === 'function'
      ? 'needs-permission'
      : 'active';
  });

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const gamma = event.gamma ?? 0; // roll, [-90, 90]
    const beta = event.beta ?? 0; // pitch, [-180, 180]

    const smoothed = smoothedRef.current;
    smoothed.gamma += SMOOTHING_ALPHA * (gamma - smoothed.gamma);
    smoothed.beta += SMOOTHING_ALPHA * (beta - smoothed.beta);

    const lastAccepted = lastAcceptedVisualRawRef.current;
    if (
      lastAccepted === null ||
      isOrientationContinuous(lastAccepted, { gamma, beta })
    ) {
      const visual = visualSmoothedRef.current;
      visual.gamma += SMOOTHING_ALPHA * (gamma - visual.gamma);
      visual.beta += SMOOTHING_ALPHA * (beta - visual.beta);
      orientationRef.current = { gamma: visual.gamma, beta: visual.beta };
      lastAcceptedVisualRawRef.current = { gamma, beta };
    }

    const x = -Math.min(Math.abs(smoothed.gamma) / PITCH_NORMALIZER, 1);
    const y = pitchTiltFromBeta(smoothed.beta);
    tiltRef.current = { x, y };

    // Playback uses raw angles; UI readout uses smoothed tiltRef.
    const xRaw = -Math.min(Math.abs(gamma) / PITCH_NORMALIZER, 1);
    const yRaw = pitchTiltFromBeta(beta);
    rawTiltRef.current = { x: xRaw, y: yRaw };

    const now = performance.now();
    if (now - lastReadoutRef.current >= READOUT_INTERVAL_MS) {
      lastReadoutRef.current = now;
      setTilt({ x, y });
    }
  }, []);

  useEffect(() => {
    if (status !== 'active') return;
    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [status, handleOrientation]);

  const requestPermission = useCallback(async () => {
    if (status !== 'needs-permission' && status !== 'denied') return;
    const ctor = window.DeviceOrientationEvent as unknown as PermissionedOrientationEvent;
    if (typeof ctor.requestPermission !== 'function') {
      setStatus('active');
      return;
    }
    try {
      const result = await ctor.requestPermission();
      setStatus(result === 'granted' ? 'active' : 'denied');
    } catch {
      // Throws if not called from a user gesture, or on insecure origins.
      setStatus('denied');
    }
  }, [status]);

  return { tiltRef, rawTiltRef, orientationRef, tilt, status, requestPermission };
}
