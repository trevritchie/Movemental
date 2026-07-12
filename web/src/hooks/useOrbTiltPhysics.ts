import { useEffect, useRef, type RefObject } from 'react';
import type { OrientationAngles } from './useDeviceTilt';
import {
  ORB_PHYSICS_FLAT_TILT,
  ORB_PHYSICS_IDLE_FRAMES,
  ORB_PHYSICS_IDLE_SPEED,
  shouldPauseOrbPhysics,
} from '../audio/visualPriority';
import {
  computeBubbleLevelTarget,
  fallbackOrbDiameter,
  stepBubbleLevelOffset,
  type Point2D,
} from './orbPhysics';

/** Group container that receives the bubble-level offset. */
const FOLLOWER_SELECTOR = '.mouse-follower';
const ORB_SELECTOR = '.glow-orb';

export interface OrbPhysicsFrameMetrics {
  moving: boolean;
}

/**
 * Drives the swirling orb group in tilt mode like an inverted spirit level.
 *
 * Reads smoothed gamma/beta from orientationRef each frame (no React state) and
 * writes a centered translate3d on `.mouse-follower`. CSS swirl/float keep running
 * on child orbs; only the group offset is JS-driven.
 */
export function useOrbTiltPhysics({
  enabled,
  playfieldRef,
  orientationRef,
  onFrameMetrics,
}: {
  enabled: boolean;
  playfieldRef: RefObject<HTMLElement | null>;
  orientationRef: RefObject<OrientationAngles>;
  onFrameMetrics?: (metrics: OrbPhysicsFrameMetrics) => void;
}): void {
  const offsetRef = useRef<Point2D>({ x: 0, y: 0 });
  const boundsRef = useRef({ width: 0, height: 0 });
  const maxOrbDiameterRef = useRef(0);
  const followerRef = useRef<HTMLElement | null>(null);
  const lastTransformRef = useRef('');
  const idleFramesRef = useRef(0);
  const lastGammaRef = useRef(0);
  const lastBetaRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const playfield = playfieldRef.current;
    if (!playfield) return;

    let frameId = 0;

    const measureOrbDiameter = () => {
      const orbs = playfield.querySelectorAll<HTMLElement>(ORB_SELECTOR);
      let maxDiameter = 0;
      orbs.forEach((orb) => {
        maxDiameter = Math.max(maxDiameter, orb.offsetWidth);
      });
      maxOrbDiameterRef.current =
        maxDiameter > 0
          ? maxDiameter
          : fallbackOrbDiameter(boundsRef.current);
    };

    const refreshFollower = () => {
      followerRef.current = playfield.querySelector<HTMLElement>(FOLLOWER_SELECTOR);
    };

    const measureBounds = () => {
      const rect = playfield.getBoundingClientRect();
      boundsRef.current = {
        width: Math.max(rect.width, 0),
        height: Math.max(rect.height, 0),
      };
      refreshFollower();
      measureOrbDiameter();
    };

    measureBounds();

    const resizeObserver = new ResizeObserver(() => {
      measureBounds();
    });
    resizeObserver.observe(playfield);

    const tick = () => {
      if (!followerRef.current) {
        refreshFollower();
        frameId = requestAnimationFrame(tick);
        return;
      }

      if (shouldPauseOrbPhysics()) {
        onFrameMetrics?.({ moving: false });
        frameId = requestAnimationFrame(tick);
        return;
      }

      const { gamma, beta } = orientationRef.current;
      const tiltChanged =
        Math.abs(gamma - lastGammaRef.current) > 0.05 ||
        Math.abs(beta - lastBetaRef.current) > 0.05;
      lastGammaRef.current = gamma;
      lastBetaRef.current = beta;

      const flatDevice =
        Math.abs(gamma) < ORB_PHYSICS_FLAT_TILT &&
        Math.abs(beta) < ORB_PHYSICS_FLAT_TILT;
      const current = offsetRef.current;
      const nearCenter =
        Math.hypot(current.x, current.y) < ORB_PHYSICS_IDLE_SPEED;

      if (!tiltChanged && flatDevice && nearCenter) {
        idleFramesRef.current += 1;
      } else {
        idleFramesRef.current = 0;
      }

      if (idleFramesRef.current >= ORB_PHYSICS_IDLE_FRAMES) {
        onFrameMetrics?.({ moving: false });
        frameId = requestAnimationFrame(tick);
        return;
      }

      if (maxOrbDiameterRef.current <= 0) {
        measureOrbDiameter();
      }

      const target = computeBubbleLevelTarget(
        gamma,
        beta,
        boundsRef.current,
        maxOrbDiameterRef.current,
      );
      const next = stepBubbleLevelOffset(current, target);
      offsetRef.current = next;

      const moving =
        Math.hypot(next.x - current.x, next.y - current.y) >
          ORB_PHYSICS_IDLE_SPEED ||
        !flatDevice ||
        tiltChanged;

      const transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
      if (lastTransformRef.current !== transform) {
        followerRef.current.style.transform = transform;
        lastTransformRef.current = transform;
      }

      onFrameMetrics?.({ moving });
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      idleFramesRef.current = 0;
      offsetRef.current = { x: 0, y: 0 };
      maxOrbDiameterRef.current = 0;
      if (followerRef.current) {
        followerRef.current.style.transform = '';
      }
      lastTransformRef.current = '';
      onFrameMetrics?.({ moving: false });
    };
  }, [enabled, playfieldRef, orientationRef, onFrameMetrics]);
}
