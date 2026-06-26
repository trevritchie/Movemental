/**
 * User-agent helpers for iOS recording, fullscreen, and layout branching.
 * Used by hooks and audio export to pick codecs and APIs per platform.
 */

/** True when running in iPhone Safari (not iPad). */
export function isIphone(): boolean {
  return /iPhone/i.test(getUserAgent());
}

function getUserAgent(): string {
  if (typeof navigator === 'undefined') {
    return '';
  }
  return navigator.userAgent;
}

/** True on iOS devices (all browsers use WebKit). */
export function isIos(): boolean {
  return /iPhone|iPad|iPod/i.test(getUserAgent());
}

/** True on desktop Safari (not Chromium-based browsers). */
export function isSafari(): boolean {
  const ua = getUserAgent();
  return /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/i.test(ua);
}

/** Prefer M4A recording on Apple WebKit (iOS cannot decode WebM natively). */
export function isAppleRecordingPlatform(): boolean {
  return isIos() || isSafari();
}

/** Chromium desktop/Android (Chrome, Edge, etc.). MP4 muxer on Chrome 126+. */
export function isChromium(): boolean {
  return /Chrome|Chromium|Edg/i.test(getUserAgent());
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
