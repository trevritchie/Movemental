import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FLAT_TILT,
  mapTiltToPositions,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import { isIOSPlatform } from '../audio/haptics';

export type TiltStatus =
  | 'unsupported'
  | 'needs-permission'
  | 'denied'
  | 'active';

// iOS exposes a static requestPermission on the event constructor.
interface PermissionedOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

const SMOOTHING_ALPHA = 0.25; // exponential moving average weight per event
const READOUT_INTERVAL_MS = 150; // throttle for the React-visible sample

/**
 * Reads device orientation and exposes it as a normalized tilt sample in the
 * engine's coordinate space (see TiltVoicingEngine): both axes in [-1, 0],
 * where 0 is flat.
 *
 * deviceorientation angles are used rather than devicemotion acceleration
 * because the angles are sign-consistent across browsers (iOS has a known
 * sign quirk in accelerationIncludingGravity).
 *
 * - x: roll magnitude (|gamma| / 90), so either roll direction narrows the
 *   voicing. Fully vertical maps to -1.
 * - y: chest-ward pitch (beta / 90, positive beta only), matching the
 *   Python version where only one pitch direction raises the pivot.
 *
 * onLevelChange fires whenever the quantized voicing level (the step pair
 * from mapTiltToPositions) changes, e.g. to drive haptic feedback.
 */
export function useDeviceTilt(onLevelChange?: () => void) {
  const tiltRef = useRef<TiltSample>({ ...FLAT_TILT });
  const smoothedRef = useRef({ gamma: 0, beta: 0 });
  const lastReadoutRef = useRef(0);
  const lastLevelRef = useRef<{ inputSteps: number; pivotSteps: number } | null>(
    null
  );
  // iOS switch haptics require a user gesture. Track the latest sensed level
  // from orientation separately from the last level that actually fired a
  // haptic, so touchmove can deliver ticks while the user is touching the
  // screen.
  const lastHapticLevelRef = useRef<{ inputSteps: number; pivotSteps: number } | null>(
    null
  );
  const rawTiltRef = useRef<TiltSample>({ ...FLAT_TILT });
  const onLevelChangeRef = useRef(onLevelChange);
  useEffect(() => {
    onLevelChangeRef.current = onLevelChange;
  }, [onLevelChange]);

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

    const x = -Math.min(Math.abs(smoothed.gamma) / 90, 1);
    const y = -Math.min(Math.max(smoothed.beta / 90, 0), 1);
    tiltRef.current = { x, y };

    // Level detection uses raw angles so haptic ticks are not delayed by
    // the display smoothing filter.
    const xRaw = -Math.min(Math.abs(gamma) / 90, 1);
    const yRaw = -Math.min(Math.max(beta / 90, 0), 1);
    rawTiltRef.current = { x: xRaw, y: yRaw };
    const level = mapTiltToPositions(rawTiltRef.current);
    const lastLevel = lastLevelRef.current;
    if (
      lastLevel !== null &&
      (level.inputSteps !== lastLevel.inputSteps ||
        level.pivotSteps !== lastLevel.pivotSteps)
    ) {
      // Android: vibrate works from sensor callbacks. iOS: defer to touch
      // handlers below, which run inside a user gesture.
      if (!isIOSPlatform()) {
        onLevelChangeRef.current?.();
        lastHapticLevelRef.current = level;
      }
    }
    lastLevelRef.current = level;

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

  // iOS: deliver haptic ticks during touch events when a level crossing was
  // sensed from orientation but could not fire haptics without a gesture.
  useEffect(() => {
    if (status !== 'active' || !isIOSPlatform()) return;

    const maybeHapticFromTouch = () => {
      const sensed = lastLevelRef.current;
      const lastHaptic = lastHapticLevelRef.current;
      if (!sensed) return;
      if (
        lastHaptic !== null &&
        sensed.inputSteps === lastHaptic.inputSteps &&
        sensed.pivotSteps === lastHaptic.pivotSteps
      ) {
        return;
      }
      onLevelChangeRef.current?.();
      lastHapticLevelRef.current = sensed;
    };

    window.addEventListener('touchstart', maybeHapticFromTouch, { passive: true });
    window.addEventListener('touchmove', maybeHapticFromTouch, { passive: true });
    return () => {
      window.removeEventListener('touchstart', maybeHapticFromTouch);
      window.removeEventListener('touchmove', maybeHapticFromTouch);
    };
  }, [status]);

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

  return { tiltRef, tilt, status, requestPermission };
}
