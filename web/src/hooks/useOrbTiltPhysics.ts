import { useEffect, useRef, type RefObject } from 'react';
import type { OrientationAngles } from './useDeviceTilt';
import {
  computePlayfieldBounds,
  computeOrbRadius,
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

  useEffect(() => {
    if (!enabled) return;

    const playfield = playfieldRef.current;
    if (!playfield) return;

    let frameId = 0;

    const getOrbElements = (): HTMLElement[] =>
      Array.from(playfield.querySelectorAll<HTMLElement>(ORB_SELECTOR));

    const measureBounds = () => {
      const rect = playfield.getBoundingClientRect();
      const bounds = computePlayfieldBounds(rect);
      const sizeChanged =
        bounds.width !== boundsRef.current.width ||
        bounds.height !== boundsRef.current.height;

      boundsRef.current = bounds;

      const orbCount = getOrbElements().length;
      if (sizeChanged || orbsRef.current.length !== orbCount) {
        orbsRef.current = createInitialOrbStates(bounds, orbCount);
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

      stepOrbPhysics(orbs, bounds, gamma, beta);

      const radius = computeOrbRadius(bounds);
      const elements = getOrbElements();
      for (let i = 0; i < orbs.length; i += 1) {
        const el = elements[i];
        if (!el) continue;
        const orb = orbs[i];
        // orb.x/y are center coords; orb divs are sized 40cqmin (see index.css).
        el.style.transform = `translate3d(${orb.x - radius}px, ${orb.y - radius}px, 0)`;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      for (const el of getOrbElements()) {
        el.style.transform = '';
      }
    };
  }, [enabled, playfieldRef, orientationRef]);
}
