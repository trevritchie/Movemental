import { useEffect, useRef, type RefObject } from 'react';
import type { OrientationAngles } from './useDeviceTilt';
import {
  createInitialOrbStates,
  stepOrbPhysics,
  type OrbState,
} from './orbPhysics';

const ORB_SELECTOR = '.diagram-glow-orb';

/**
 * Drives diagram orb positions in tilt mode via requestAnimationFrame.
 *
 * Reads smoothed gamma/beta from orientationRef each frame (no React state) and
 * writes transforms directly to orb DOM nodes. Positions are orb-center coordinates;
 * translate offsets by radius so the top-left of each orb div aligns correctly.
 *
 * Resets orb positions when the playfield resizes. Clears inline transforms on
 * teardown so ambient CSS animations can resume when physics deactivates.
 */
export function useOrbTiltPhysics({
  enabled,
  playfieldRef,
  orientationRef,
}: {
  enabled: boolean;
  playfieldRef: RefObject<HTMLElement | null>;
  orientationRef: RefObject<OrientationAngles>;
}): void {
  const orbsRef = useRef<OrbState[]>([]);
  const boundsRef = useRef({ width: 0, height: 0 });
  const elementsRef = useRef<HTMLElement[]>([]);
  const lastTransformsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const playfield = playfieldRef.current;
    if (!playfield) return;

    let frameId = 0;

    const refreshOrbElements = () => {
      elementsRef.current = Array.from(
        playfield.querySelectorAll<HTMLElement>(ORB_SELECTOR),
      );
    };

    const measureBounds = () => {
      const rect = playfield.getBoundingClientRect();
      const bounds = {
        width: Math.max(rect.width, 0),
        height: Math.max(rect.height, 0),
      };
      const sizeChanged =
        bounds.width !== boundsRef.current.width ||
        bounds.height !== boundsRef.current.height;

      boundsRef.current = bounds;
      refreshOrbElements();

      const orbCount = elementsRef.current.length;
      if (sizeChanged || orbsRef.current.length !== orbCount) {
        orbsRef.current = createInitialOrbStates(bounds, orbCount);
        lastTransformsRef.current = [];
      }
    };

    measureBounds();

    const resizeObserver = new ResizeObserver(() => {
      measureBounds();
    });
    resizeObserver.observe(playfield);

    const tick = () => {
      const bounds = boundsRef.current;
      const orbs = orbsRef.current;
      const { gamma, beta } = orientationRef.current;

      const radius = stepOrbPhysics(orbs, bounds, gamma, beta);
      const elements = elementsRef.current;
      for (let i = 0; i < orbs.length; i += 1) {
        const el = elements[i];
        if (!el) continue;
        const orb = orbs[i];
        const transform = `translate3d(${orb.x - radius}px, ${orb.y - radius}px, 0)`;
        if (lastTransformsRef.current[i] !== transform) {
          el.style.transform = transform;
          lastTransformsRef.current[i] = transform;
        }
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      for (const el of elementsRef.current) {
        el.style.transform = '';
      }
      lastTransformsRef.current = [];
    };
  }, [enabled, playfieldRef, orientationRef]);
}
