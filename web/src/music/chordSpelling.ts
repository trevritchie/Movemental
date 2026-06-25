/**
 * Degree-aware note spelling for chord readouts (flat vs sharp roots, maj6/min6).
 */

import { NOTE_NAMES_FLAT, NOTE_NAMES_SHARP } from './config';
import type { Chord } from './ChordManager';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

const NATURAL_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const ACCIDENTAL_SYMBOL: Record<number, string> = {
  0: '',
  1: '#',
  [-1]: 'b',
  2: '##',
  [-2]: 'bb',
};

interface QualityTemplate {
  semitones: number[];
  letterSteps: number[];
}

const QUALITY_TEMPLATES: Record<string, QualityTemplate> = {
  ' maj6': { semitones: [0, 4, 7, 9], letterSteps: [0, 2, 4, 5] },
  ' min6': { semitones: [0, 3, 7, 8], letterSteps: [0, 2, 4, 5] },
  ' diminished': { semitones: [0, 3, 6, 9], letterSteps: [0, 2, 4, 6] },
  '7': { semitones: [0, 4, 7, 10], letterSteps: [0, 2, 4, 6] },
  '7b5': { semitones: [0, 4, 6, 10], letterSteps: [0, 2, 4, 6] },
};

export interface DegreeSpelling {
  pitchClass: number;
  noteName: string;
}

function rootLetterIndex(rootPitchClass: number, useSharpRoot: boolean): number {
  const rootName = useSharpRoot
    ? NOTE_NAMES_SHARP[rootPitchClass % 12]
    : NOTE_NAMES_FLAT[rootPitchClass % 12];
  return LETTERS.indexOf(rootName[0] as (typeof LETTERS)[number]);
}

function accidentalForLetter(
  letter: string,
  targetPc: number,
  flatOnly: boolean
): string {
  const naturalPc = NATURAL_PC[letter];
  const offsets = flatOnly ? [0, -1] : [0, 1, -1, 2, -2];

  for (const offset of offsets) {
    const pc = (naturalPc + offset + 120) % 12;
    if (pc === targetPc) {
      return letter + ACCIDENTAL_SYMBOL[offset];
    }
  }

  return NOTE_NAMES_FLAT[targetPc];
}

function spellingComplexity(noteNames: string[]): number {
  let score = 0;
  for (const name of noteNames) {
    if (name.includes('##') || name.includes('bb')) score += 10;
    else if (name.includes('#') || name.includes('b')) score += 1;
  }
  return score;
}

function spellWithRoot(
  rootPitchClass: number,
  quality: string,
  useSharpRoot: boolean
): DegreeSpelling[] {
  const template = QUALITY_TEMPLATES[quality];
  if (!template) {
    return [];
  }

  const rootPc = rootPitchClass % 12;
  const rootIdx = rootLetterIndex(rootPc, useSharpRoot);
  const flatOnly = quality === ' diminished';

  if (flatOnly) {
    return template.semitones.map((semitone) => {
      const pitchClass = (rootPc + semitone) % 12;
      return {
        pitchClass,
        noteName: NOTE_NAMES_FLAT[pitchClass],
      };
    });
  }

  return template.semitones.map((semitone, i) => {
    const pitchClass = (rootPc + semitone) % 12;
    if (quality === '7b5' && i === 2) {
      return { pitchClass, noteName: NOTE_NAMES_FLAT[pitchClass] };
    }
    const letter = LETTERS[(rootIdx + template.letterSteps[i]) % 7];
    const noteName = accidentalForLetter(letter, pitchClass, false);
    return { pitchClass, noteName };
  });
}

export function spellChordDegrees(
  rootPitchClass: number,
  quality: string
): DegreeSpelling[] {
  if (!QUALITY_TEMPLATES[quality]) {
    return [];
  }

  const flatSpellings = spellWithRoot(rootPitchClass, quality, false);

  if (quality === ' diminished') {
    return flatSpellings;
  }

  const flatNames = flatSpellings.map((d) => d.noteName);
  if (!flatNames.some((n) => n.includes('##') || n.includes('bb'))) {
    return flatSpellings;
  }

  const sharpSpellings = spellWithRoot(rootPitchClass, quality, true);
  if (
    spellingComplexity(sharpSpellings.map((d) => d.noteName)) <
    spellingComplexity(flatNames)
  ) {
    return sharpSpellings;
  }

  return flatSpellings;
}

export function buildDegreeSpellingMap(
  chord: Chord | null | undefined
): Map<number, string> | null {
  if (
    !chord?.quality ||
    !chord.pitches?.length ||
    chord.rootPositionIndex === undefined
  ) {
    return null;
  }

  const rootPitchClass = chord.pitches[chord.rootPositionIndex] % 12;
  const degrees = spellChordDegrees(rootPitchClass, chord.quality);
  const map = new Map<number, string>();

  for (const { pitchClass, noteName } of degrees) {
    map.set(pitchClass, noteName);
  }

  return map;
}

export function spellMidiNote(
  midi: number,
  degreeSpellings: Map<number, string> | null
): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const noteName =
    degreeSpellings?.get(pitchClass) ?? NOTE_NAMES_FLAT[pitchClass];
  return `${noteName}${octave}`;
}
