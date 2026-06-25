/**
 * Element chemistry subscripts (Earth / Wind / Fire counts) from sounded pitch
 * classes relative to the tonal center. Used by the diagram overlay readout.
 */

export interface ElementFormula {
  earth: number;
  wind: number;
  fire: number;
}

/**
 * Count Earth / Wind / Fire weights for the chemistry readout.
 *
 * Each unique pitch class contributes at most once, so doubled roots in
 * wide voicings (e.g. Bb3 and Bb4) do not inflate the subscripts.
 */
export function computeElementFormula(
  activePitches: (number | null)[],
  tonalCenter: number
): ElementFormula | null {
  const pitchClasses = new Set<number>();
  for (const pitch of activePitches) {
    if (pitch === null) continue;
    pitchClasses.add(((pitch % 12) + 12) % 12);
  }
  if (pitchClasses.size === 0) return null;

  let earth = 0;
  let wind = 0;
  let fire = 0;
  for (const pitchClass of pitchClasses) {
    const relPc = ((pitchClass - tonalCenter) + 12) % 12;
    const rem = relPc % 3;
    if (rem === 0) earth++;
    else if (rem === 1) wind++;
    else fire++;
  }
  return { earth, wind, fire };
}
