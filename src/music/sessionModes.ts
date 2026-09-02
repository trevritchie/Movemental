/**
 * Session and voice-leading product types shared by music, settings, and UI.
 *
 * Lives in the domain tier so music modules do not depend on React context.
 */

export type PlayStyle = 'tap_and_hold' | 'tap';

export type VoiceLeadingMode = 'root_position' | 'smooth' | 'smoothest';

export type ClockLayoutMode = 'chromatic' | 'circle_of_fifths';

/** Roll-stop density for the voicing elevator (tilt + no-tilt VOICING). */
export type VoicingElevatorFloorsMode = 'all' | 'every_other';

export type DiagramLayoutMode =
  | 'complete_geometry'
  | 'major'
  | 'natural_minor'
  | 'minor'
  | 'blues'
  | 'jazz_blues'
  | 'rhythm_changes';

/** Device tilt controls voicing (splash choice; not changed in settings). */
export function usesDeviceTilt(tiltModeEnabled: boolean): boolean {
  return tiltModeEnabled;
}

/** Smoothest mode commits parallel ladder steps after each chord for re-taps. */
export function commitsSmoothestParallelBaseline(
  mode: VoiceLeadingMode,
): boolean {
  return mode === 'smoothest';
}
