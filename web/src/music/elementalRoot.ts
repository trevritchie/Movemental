/**
 * Elemental diminished roots, opposite-edge navigation, and playback register
 * resolution for Earth / Wind / Fire triangle chords.
 */

import { ELEMENTAL_RELATIONSHIPS, NOTE_NAMES_FLAT, OCTAVE } from './config';
import type { Chord } from './ChordManager';
import {
  computeTiltVoicing,
  type TiltSample,
  type TiltVoicingAnchor,
} from './TiltVoicingEngine';

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

/** True when the previous chord borrows from the target element. */
export function isOppositeElementNavigation(
  previousChord: Chord | null,
  element: ElementalName
): boolean {
  if (!previousChord) {
    return false;
  }
  return ELEMENTAL_RELATIONSHIPS[previousChord.name]?.[0] === element;
}

/** Lowest MIDI note in a voiced spread. */
export function previousBassMidi(voicedMidi: number[]): number | undefined {
  if (voicedMidi.length === 0) {
    return undefined;
  }
  return Math.min(...voicedMidi);
}

function uniquePitchClasses(pitches: number[]): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const pitch of pitches) {
    const pitchClass = pitch % 12;
    if (!seen.has(pitchClass)) {
      seen.add(pitchClass);
      result.push(pitchClass);
    }
  }
  return result;
}

function elementalPitchStructure(chord: Chord): (number | null)[] {
  const structure: (number | null)[] = [null, null, null, null];
  for (let i = 0; i < chord.pitches.length && i < 4; i++) {
    structure[i] = chord.pitches[i];
  }
  return structure;
}

/**
 * Default diminished root for an element at the current tonal center.
 */
export function resolveElementalRoot(
  element: ElementalName,
  tonalCenter: number
): number {
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
 * Home MIDI for a chord root relative to the tonal center and home octave.
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
  octaveRange: number
): {
  chord: Chord;
  rootPitchClass: number;
  homeMidi: number;
} {
  const element = chord.name as ElementalName;
  const rootPitchClass = resolveElementalRoot(element, tonalCenter);
  const anchorChildRoot =
    (OPPOSITE_BASE_CHILD_ROOT_PC[element] + tonalCenter) % 12;

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

/**
 * Opposite-element navigation: pick the diminished rotation whose sounded bass
 * sits one or two semitones below the previous sounded bass at the planned tilt.
 */
export function resolveOppositeElementalPlayback(
  chord: Chord,
  tonalCenter: number,
  octaveRange: number,
  previousBassMidiValue: number,
  plannedTilt: TiltSample,
  anchor: TiltVoicingAnchor
): {
  chord: Chord;
  rootPitchClass: number;
  homeMidi: number;
} | null {
  const anchorBassPitchClass = previousBassMidiValue % 12;
  const pitchStructure = elementalPitchStructure(chord);
  const candidateRoots = uniquePitchClasses(chord.pitches);
  const targets = [previousBassMidiValue - 1, previousBassMidiValue - 2];

  for (const target of targets) {
    for (const rootPitchClass of candidateRoots) {
      const homeMidi = computeElementalHomeMidi(
        rootPitchClass,
        tonalCenter,
        octaveRange,
        anchorBassPitchClass
      );
      const voiced = computeTiltVoicing(
        pitchStructure,
        rootPitchClass,
        plannedTilt,
        octaveRange,
        tonalCenter,
        homeMidi,
        { anchor }
      );
      if (voiced.length > 0 && Math.min(...voiced) === target) {
        return {
          chord: withElementalRoot(chord, rootPitchClass),
          rootPitchClass,
          homeMidi,
        };
      }
    }
  }

  return null;
}

/**
 * Unified elemental resolution for playback: opposite-element bass search when
 * applicable, otherwise the default diminished root and register.
 */
export function resolveElementalForNavigation(
  chord: Chord,
  tonalCenter: number,
  octaveRange: number,
  previousChord: Chord | null,
  previousBassMidiValue: number | undefined,
  plannedTilt: TiltSample,
  anchor: TiltVoicingAnchor
): {
  chord: Chord;
  rootPitchClass: number;
  homeMidi: number;
} {
  const element = chord.name as ElementalName;

  if (
    previousChord &&
    previousBassMidiValue !== undefined &&
    isOppositeElementNavigation(previousChord, element)
  ) {
    const opposite = resolveOppositeElementalPlayback(
      chord,
      tonalCenter,
      octaveRange,
      previousBassMidiValue,
      plannedTilt,
      anchor
    );
    if (opposite) {
      return opposite;
    }
  }

  return resolveElementalPlayback(chord, tonalCenter, octaveRange);
}

/**
 * Smooth mode elemental resolution: default diminished root and register at
 * the current tonal center, with no navigation history. Matches
 * CHORD_FLAT_PARALLEL table generation from flat double-octave Branch.
 */
export function resolveDeterministicElementalPlayback(
  chord: Chord,
  tonalCenter: number,
  octaveRange: number
): {
  chord: Chord;
  rootPitchClass: number;
  homeMidi: number;
} {
  return resolveElementalPlayback(chord, tonalCenter, octaveRange);
}
