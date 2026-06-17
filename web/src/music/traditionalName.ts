import { NOTE_NAMES_FLAT } from './config';

/**
 * Build the traditional chord display name from root pitch class and quality.
 * maj6 and min6 include slash equivalents (relative minor 3 semitones below).
 */
export function formatTraditionalName(
  rootPitchClass: number,
  quality: string
): string {
  const pc = rootPitchClass % 12;
  const root = NOTE_NAMES_FLAT[pc];
  const base = root + quality;

  if (quality === ' maj6') {
    const rel = NOTE_NAMES_FLAT[(pc - 3 + 12) % 12];
    return `${base} / ${rel} min7`;
  }
  if (quality === ' min6') {
    const rel = NOTE_NAMES_FLAT[(pc - 3 + 12) % 12];
    return `${base} / ${rel} min7b5`;
  }
  return base;
}
