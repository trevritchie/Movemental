/** True when running in iPhone Safari (not iPad). */
export function isIphone(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone/i.test(navigator.userAgent);
}

/** Whether the Fullscreen API can be invoked on the document element. */
export function supportsBrowserFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  if (document.fullscreenEnabled === false) return false;
  return !!(
    root.requestFullscreen ?? root.webkitRequestFullscreen
  );
}
