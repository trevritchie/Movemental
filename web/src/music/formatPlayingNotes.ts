import { NOTE_NAMES_FLAT } from './config';

/** Convert a MIDI note number to flat spelling with octave (e.g. 60 -> C4). */
export function midiToNoteName(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES_FLAT[pitchClass]}${octave}`;
}

/** Space-separated ascending note names for the currently voiced pitches. */
export function formatPlayingNotes(pitches: (number | null)[]): string {
  return pitches
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b)
    .map(midiToNoteName)
    .join(' ');
}

/**
 * Desktop chord readout: traditional name plus playing notes when available.
 * e.g. "Bb maj6 - Bb4 D5 F5 G5"
 */
export function formatChordReadout(
  traditionalName: string | null,
  pitches: (number | null)[]
): string {
  if (!traditionalName) return '---';

  const notes = formatPlayingNotes(pitches);
  if (!notes) return traditionalName;

  return `${traditionalName} - ${notes}`;
}
