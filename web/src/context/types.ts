/**
 * Shared play-style and voice-leading types used by ChordContext and music
 * modules. Helpers here encode product rules (tilt session vs audio style).
 */

export type PlayStyle = 'click_and_hold' | 'drone';

export type VoiceLeadingMode = 'root_position' | 'smooth' | 'smoothest';

export type ClockLayoutMode = 'chromatic' | 'circle_of_fifths';

/** Device tilt controls voicing (splash choice; not changed in settings). */
export function usesDeviceTilt(tiltModeEnabled: boolean): boolean {
  return tiltModeEnabled;
}

/** Smoothest mode commits parallel ladder steps after each chord for re-taps. */
export function commitsSmoothestParallelBaseline(
  mode: VoiceLeadingMode
): boolean {
  return mode === 'smoothest';
}
