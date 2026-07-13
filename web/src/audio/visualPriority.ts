/**
 * When JS-driven orb physics should pause (tab hidden or reduced motion).
 *
 * This is not a general audio-priority scheduler. Chord taps do not suspend
 * visuals here; idle rAF sleep lives in useOrbTiltPhysics. Cheap composited
 * CSS (splash swirl) is intentionally never gated.
 *
 * Call initVisualPriorityListeners() once at app boot. Any JS visual loop
 * must consult shouldPauseOrbPhysics().
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
