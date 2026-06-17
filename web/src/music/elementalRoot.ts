import { ELEMENTAL_RELATIONSHIPS, NOTE_NAMES_FLAT, OCTAVE } from './config';
import type { Chord } from './ChordManager';

export const ELEMENTAL_NAMES = ['Earth', 'Wind', 'Fire'] as const;
export type ElementalName = (typeof ELEMENTAL_NAMES)[number];

/** First pitch class (C region) of the base child on each element's opposite edge. */
const OPPOSITE_BASE_CHILD_ROOT_PC: Record<ElementalName, number> = {
  Fire: 0, // Branch (Earth+Wind)
  Earth: 7, // Smoke (Wind+Fire)
  Wind: 5, // Glass (Fire+Earth)
};

export function isElementalName(name: string): name is ElementalName {
  return (ELEMENTAL_NAMES as readonly string[]).includes(name);
}

export function getChordRootPitchClass(chord: Chord): number {
  return chord.pitches[chord.rootPositionIndex] % 12;
}

/** Half step below a pitch class. */
export function semitoneBelow(pitchClass: number): number {
  return (pitchClass + 11) % 12;
}

/**
 * Default diminished root for an element: one semitone below the root of the
 * base child chord on the opposite triangle edge (Branch / Smoke / Glass).
 */
export function getDefaultElementalRoot(
  element: ElementalName,
  tonalCenter: number
): number {
  const oppositeChildRoot =
    (OPPOSITE_BASE_CHILD_ROOT_PC[element] + tonalCenter) % 12;
  return semitoneBelow(oppositeChildRoot);
}

/**
 * Resolve the diminished root for an element. When the previously played chord
 * borrows from this element, root one semitone below that child's root.
 */
export function resolveElementalRoot(
  element: ElementalName,
  tonalCenter: number,
  previousChord: Chord | null
): number {
  if (previousChord) {
    const opposite = ELEMENTAL_RELATIONSHIPS[previousChord.name]?.[0];
    if (opposite === element) {
      return semitoneBelow(getChordRootPitchClass(previousChord));
    }
  }
  return getDefaultElementalRoot(element, tonalCenter);
}

export function elementalTraditionalName(rootPitchClass: number): string {
  return `${NOTE_NAMES_FLAT[rootPitchClass]} diminished`;
}

export function findRootPositionIndex(
  pitches: number[],
  rootPitchClass: number
): number {
  for (let i = 0; i < pitches.length; i++) {
    if (pitches[i] % 12 === rootPitchClass) {
      return i;
    }
  }
  return 0;
}

/** Apply a resolved diminished root to an elemental chord for playback/display. */
export function withElementalRoot(chord: Chord, rootPitchClass: number): Chord {
  return {
    ...chord,
    rootPositionIndex: findRootPositionIndex(chord.pitches, rootPitchClass),
    traditionalName: elementalTraditionalName(rootPitchClass),
  };
}

/**
 * Home MIDI for a chord root relative to the tonal center and octave range.
 */
export function computeChordHomeMidi(
  rootPitchClass: number,
  tonalCenter: number,
  octaveRange: number
): number {
  return (
    tonalCenter +
    OCTAVE * (octaveRange + 2) +
    ((rootPitchClass - tonalCenter + OCTAVE) % OCTAVE)
  );
}

/** Signed semitone distance from one pitch class to another (never wraps past ±6). */
function signedPitchClassDelta(fromPc: number, toPc: number): number {
  const mod = (toPc - fromPc + OCTAVE) % OCTAVE;
  return mod > 6 ? mod - OCTAVE : mod;
}

/**
 * Pivot register for an elemental diminished chord so its unison sits at the
 * correct signed semitone offset from the opposite child's pivot (contrary
 * motion anchor).
 */
export function computeElementalHomeMidi(
  elementalRootPitchClass: number,
  tonalCenter: number,
  octaveRange: number,
  anchorChildRootPitchClass: number
): number {
  const childHome = computeChordHomeMidi(
    anchorChildRootPitchClass,
    tonalCenter,
    octaveRange
  );
  return (
    childHome +
    signedPitchClassDelta(anchorChildRootPitchClass, elementalRootPitchClass)
  );
}

export function resolveElementalPlayback(
  chord: Chord,
  tonalCenter: number,
  octaveRange: number,
  previousChord: Chord | null
): {
  chord: Chord;
  rootPitchClass: number;
  homeMidi: number;
} {
  const element = chord.name as ElementalName;
  const rootPitchClass = resolveElementalRoot(
    element,
    tonalCenter,
    previousChord
  );

  // Anchor register to the opposite child's home pivot, then offset by the
  // signed semitone delta to the diminished root (contrary motion).
  let anchorChildRoot: number;
  if (
    previousChord &&
    ELEMENTAL_RELATIONSHIPS[previousChord.name]?.[0] === element
  ) {
    anchorChildRoot = getChordRootPitchClass(previousChord);
  } else {
    anchorChildRoot =
      (OPPOSITE_BASE_CHILD_ROOT_PC[element] + tonalCenter) % 12;
  }

  const homeMidi = computeElementalHomeMidi(
    rootPitchClass,
    tonalCenter,
    octaveRange,
    anchorChildRoot
  );

  return {
    chord: withElementalRoot(chord, rootPitchClass),
    rootPitchClass,
    homeMidi,
  };
}
