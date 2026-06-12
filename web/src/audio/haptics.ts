// haptics.ts
// Light haptic tick for tilt voicing changes.
//
// Android: navigator.vibrate (50ms). Works from sensor callbacks once the
// user has interacted with the page (sticky user activation from the splash
// tap).
//
// iOS: no Vibration API. Safari 17.4+ fires the Taptic Engine when a
// <input type="checkbox" switch> inside a <label> is clicked. WebKit
// requires a user gesture for switch haptics, so calls from deviceorientation
// alone may not vibrate on recent iOS. Those still run (Android path) and
// haptics always fire synchronously from tap handlers (splash, chord tap).

const VIBRATE_MS = 50;

export function isIOSPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isIOS(): boolean {
  return isIOSPlatform();
}

function iosSwitchTap(): void {
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.appendChild(input);

  document.head.appendChild(label);
  label.click();
  document.head.removeChild(label);
}

export function supportsHaptics(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia('(pointer: coarse)').matches) return false;
  return isIOS() || 'vibrate' in navigator;
}

/**
 * Fire a short haptic pulse. Prefer calling from a user-gesture handler on
 * iOS (splash Tilt button, chord tap). Also invoked on voicing-level
 * crossings during tilt (reliable on Android).
 */
export function triggerHaptic(): void {
  try {
    if (!isIOS() && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(VIBRATE_MS);
      return;
    }
    if (isIOS()) {
      iosSwitchTap();
    }
  } catch {
    // Degrade silently when haptics are unavailable.
  }
}

/**
 * Prime haptics during a user gesture (splash Tilt tap). Gives immediate
 * tactile confirmation that motion mode is active.
 */
export function primeHaptics(): void {
  triggerHaptic();
}
