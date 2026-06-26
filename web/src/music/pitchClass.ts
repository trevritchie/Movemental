/**
 * Pitch-class normalization shared by music modules and UI readouts.
 */
import type { Chord } from './ChordManager';

/** Signed-safe pitch class in 0..11. */
export function normalizePitchClass(n: number): number {
  return ((n % 12) + 12) % 12;
}

/** Pitch class relative to tonal center in 0..11. */
export function relativePitchClass(pc: number, tonalCenter: number): number {
  return ((normalizePitchClass(pc) - tonalCenter) + 12) % 12;
}

/** Root pitch class of a chord from its root position index. */
export function getChordRootPitchClass(chord: Chord): number {
  return normalizePitchClass(chord.pitches[chord.rootPositionIndex]);
}
