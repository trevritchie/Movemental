/**
 * Coordinates visual animation priority so chord playback can schedule audio first.
 * Module-level flags avoid React re-renders on lifecycle changes.
 */

/** Brief suspend window (~2 frames) during diagram pointer playback. */
export const VISUAL_SUSPEND_MS = 32;

/** Frames with no motion before physics idles out. */
export const ORB_PHYSICS_IDLE_FRAMES = 30;

/** Speed threshold (px/frame) for treating orbs as stationary. */
export const ORB_PHYSICS_IDLE_SPEED = 0.05;

/** Orientation magnitude below which tilt is treated as flat. */
export const ORB_PHYSICS_FLAT_TILT = 0.75;

let suspendUntil = 0;
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

function setAudioPriorityClass(active: boolean): void {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('audio-priority-active', active);
}

let suspendTimer = 0;

/** Pause orb/CSS work briefly while chord audio is scheduled. */
export function suspendVisualAnimations(ms = VISUAL_SUSPEND_MS): void {
  if (typeof performance === 'undefined') return;
  suspendUntil = Math.max(suspendUntil, performance.now() + ms);
  setAudioPriorityClass(true);
  if (typeof window === 'undefined') return;
  window.clearTimeout(suspendTimer);
  suspendTimer = window.setTimeout(() => {
    if (!isVisualAnimationSuspended()) {
      setAudioPriorityClass(false);
    }
  }, ms + 4);
}

export function isVisualAnimationSuspended(): boolean {
  if (typeof performance === 'undefined') return false;
  return performance.now() < suspendUntil;
}

export function isDocumentHidden(): boolean {
  return documentHidden;
}

export function prefersReducedMotion(): boolean {
  return reducedMotion;
}

/** True when the orb physics loop should not advance simulation. */
export function shouldPauseOrbPhysics(): boolean {
  return (
    documentHidden ||
    reducedMotion ||
    isVisualAnimationSuspended()
  );
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
    window.clearTimeout(suspendTimer);
    setAudioPriorityClass(false);
  };
}
