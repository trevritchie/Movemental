/**
 * Capacitor native-shell detection. Gates web-only UI (Add to Home Screen
 * hints, the browser Full Screen setting) that has no meaning, or looks
 * out of place, once the app ships as an installed Capacitor app.
 */
import { Capacitor } from '@capacitor/core';

/** True when running inside the Capacitor native shell (iOS/Android). */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Native platform name, e.g. 'ios', 'android', or 'web'. */
export function getNativePlatform(): string {
  return Capacitor.getPlatform();
}
