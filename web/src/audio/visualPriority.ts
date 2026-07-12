/**
 * Coordinates when JS-driven orb physics should pause.
 *
 * Callers: init once at app boot; any JS visual loop must consult
 * shouldPauseOrbPhysics(). Cheap composited CSS (splash swirl) is out of
 * scope and is intentionally not gated here.
 *
 * Chord taps do not suspend visuals; idle rAF sleep lives in useOrbTiltPhysics.
 */

let documentHidden =
  typeof document !== 'undefined' ? document.hidden : false;
let reducedMotion = false;

let motionMediaQuery: MediaQueryList | null = null;

function syncReducedMotion(): void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    reducedMotion = false;
    return;
  }
  motionMediaQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion = motionMediaQuery.matches;
}

export function isDocumentHidden(): boolean {
  return documentHidden;
}

export function prefersReducedMotion(): boolean {
  return reducedMotion;
}

/** True when the orb physics loop should not advance simulation. */
export function shouldPauseOrbPhysics(): boolean {
  return documentHidden || reducedMotion;
}

/** Install visibility and reduced-motion listeners (call once at app boot). */
export function initVisualPriorityListeners(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => {};
  }

  const onVisibility = () => {
    documentHidden = document.hidden;
  };

  syncReducedMotion();
  onVisibility();

  document.addEventListener('visibilitychange', onVisibility);
  motionMediaQuery?.addEventListener('change', syncReducedMotion);

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    motionMediaQuery?.removeEventListener('change', syncReducedMotion);
  };
}
