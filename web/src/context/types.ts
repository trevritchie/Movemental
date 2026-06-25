export type PlayStyle = 'click_and_hold' | 'drone' | 'tilt';

export type VoiceLeadingMode = 'root_position' | 'smooth' | 'smoothest';

/** Drone and click-and-hold use no-tilt dropdown controls instead of device tilt. */
export function isNoTiltPlayStyle(style: PlayStyle): boolean {
  return style === 'drone' || style === 'click_and_hold';
}

/** Smoothest mode commits parallel ladder steps after each chord for re-taps. */
export function commitsSmoothestParallelBaseline(
  mode: VoiceLeadingMode
): boolean {
  return mode === 'smoothest';
}
