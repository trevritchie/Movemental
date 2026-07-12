import { useEffect, useRef, type RefObject } from 'react';
import type { OrientationAngles } from './useDeviceTilt';
import { shouldPauseOrbPhysics } from '../audio/visualPriority';
import {
  ORB_PHYSICS_FLAT_TILT,
  ORB_PHYSICS_IDLE_SPEED,
  ORB_TILT_DELTA_EPS,
  computeBubbleLevelTarget,
  fallbackOrbDiameter,
  nextOrbIdleFrames,
  shouldSleepOrbPhysics,
  stepBubbleLevelOffset,
  type Point2D,
} from './orbPhysics';

/** Group container that receives the bubble-level offset. */
const FOLLOWER_SELECTOR = '.mouse-follower';
const ORB_SELECTOR = '.glow-orb';
const LEVEL_ACTIVE_CLASS = 'diagram-background-orbs--level-active';

/**
 * Drives the swirling orb group in tilt mode like an inverted spirit level.
 *
 * Reads smoothed gamma/beta from orientationRef each frame (no React state) and
 * writes a centered translate3d on `.mouse-follower`. CSS swirl/float keep running
 * on child orbs; only the group offset is JS-driven.
 *
 * When idle, cancels rAF and wakes on deviceorientation, visibility, or enable.
 * Toggles `diagram-background-orbs--level-active` via classList (no React setState).
 */
export function useOrbTiltPhysics({
  enabled,
  playfieldRef,
  containerRef,
  orientationRef,
}: {
  enabled: boolean;
  playfieldRef: RefObject<HTMLElement | null>;
  /** Root orb wrapper that receives --level-active for will-change. */
  containerRef: RefObject<HTMLElement | null>;
  orientationRef: RefObject<OrientationAngles>;
}): void {
  const offsetRef = useRef<Point2D>({ x: 0, y: 0 });
  const boundsRef = useRef({ width: 0, height: 0 });
  const maxOrbDiameterRef = useRef(0);
  const followerRef = useRef<HTMLElement | null>(null);
  const lastTransformRef = useRef('');
  const idleFramesRef = useRef(0);
  const lastGammaRef = useRef(0);
  const lastBetaRef = useRef(0);
  const sleepingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      containerRef.current?.classList.remove(LEVEL_ACTIVE_CLASS);
      return;
    }

    const playfield = playfieldRef.current;
    if (!playfield) return;

    let frameId = 0;
    let running = false;

    const setLevelActive = (moving: boolean) => {
      const el = containerRef.current;
      if (!el) return;
      el.classList.toggle(LEVEL_ACTIVE_CLASS, moving);
    };

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
      wake();
    });
    resizeObserver.observe(playfield);

    const stopLoop = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
      running = false;
    };

    const sleep = () => {
      sleepingRef.current = true;
      setLevelActive(false);
      stopLoop();
    };

    const tick = () => {
      frameId = 0;

      if (!followerRef.current) {
        refreshFollower();
        if (!followerRef.current) {
          frameId = requestAnimationFrame(tick);
          return;
        }
      }

      if (shouldPauseOrbPhysics()) {
        setLevelActive(false);
        sleep();
        return;
      }

      const { gamma, beta } = orientationRef.current;
      const tiltChanged =
        Math.abs(gamma - lastGammaRef.current) > ORB_TILT_DELTA_EPS ||
        Math.abs(beta - lastBetaRef.current) > ORB_TILT_DELTA_EPS;
      lastGammaRef.current = gamma;
      lastBetaRef.current = beta;

      const flatDevice =
        Math.abs(gamma) < ORB_PHYSICS_FLAT_TILT &&
        Math.abs(beta) < ORB_PHYSICS_FLAT_TILT;
      const current = offsetRef.current;
      const nearCenter =
        Math.hypot(current.x, current.y) < ORB_PHYSICS_IDLE_SPEED;

      idleFramesRef.current = nextOrbIdleFrames(idleFramesRef.current, {
        tiltChanged,
        flatDevice,
        nearCenter,
      });

      if (shouldSleepOrbPhysics(idleFramesRef.current)) {
        sleep();
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

      setLevelActive(moving);
      frameId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (running) return;
      running = true;
      sleepingRef.current = false;
      idleFramesRef.current = 0;
      frameId = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!enabled) return;
      if (shouldPauseOrbPhysics()) return;
      sleepingRef.current = false;
      startLoop();
    };

    const onOrientation = () => {
      wake();
    };

    const onVisibility = () => {
      if (document.hidden) {
        setLevelActive(false);
        sleep();
        return;
      }
      wake();
    };

    window.addEventListener('deviceorientation', onOrientation);
    document.addEventListener('visibilitychange', onVisibility);

    startLoop();

    return () => {
      stopLoop();
      resizeObserver.disconnect();
      window.removeEventListener('deviceorientation', onOrientation);
      document.removeEventListener('visibilitychange', onVisibility);
      idleFramesRef.current = 0;
      sleepingRef.current = false;
      offsetRef.current = { x: 0, y: 0 };
      maxOrbDiameterRef.current = 0;
      if (followerRef.current) {
        followerRef.current.style.transform = '';
      }
      lastTransformRef.current = '';
      setLevelActive(false);
    };
  }, [enabled, playfieldRef, containerRef, orientationRef]);
}
