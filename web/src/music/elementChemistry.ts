/**
 * Element chemistry subscripts (Earth / Wind / Fire counts) from sounded pitch
 * classes relative to the tonal center. Used by the diagram overlay readout.
 */
import { normalizePitchClass, relativePitchClass } from './pitchClass';
import { elementBucketForRelativePc } from './elementTokens';

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
    pitchClasses.add(normalizePitchClass(pitch));
  }
  if (pitchClasses.size === 0) return null;

  let earth = 0;
  let wind = 0;
  let fire = 0;
  for (const pc of pitchClasses) {
    const relPc = relativePitchClass(pc, tonalCenter);
    const bucket = elementBucketForRelativePc(relPc);
    if (bucket === 0) earth++;
    else if (bucket === 1) wind++;
    else fire++;
  }
  return { earth, wind, fire };
}
