import { describe, it, expect } from 'vitest';
import {
  midiToNoteName,
  formatPlayingNotes,
  formatChordReadout,
} from './formatPlayingNotes';

describe('midiToNoteName', () => {
  it('maps MIDI 60 to C4', () => {
    expect(midiToNoteName(60)).toBe('C4');
  });

  it('maps MIDI 58 to Bb3', () => {
    expect(midiToNoteName(58)).toBe('Bb3');
  });

  it('uses flat spellings for black keys', () => {
    expect(midiToNoteName(61)).toBe('Db4');
    expect(midiToNoteName(63)).toBe('Eb4');
  });
});

describe('formatPlayingNotes', () => {
  it('sorts pitches ascending and joins with spaces', () => {
    expect(formatPlayingNotes([69, 60, 64])).toBe('C4 E4 A4');
  });

  it('filters null entries', () => {
    expect(formatPlayingNotes([60, null, 64])).toBe('C4 E4');
  });

  it('returns empty string when no pitches', () => {
    expect(formatPlayingNotes([])).toBe('');
    expect(formatPlayingNotes([null, null])).toBe('');
  });
});

describe('formatChordReadout', () => {
  it('returns placeholder when no chord name', () => {
    expect(formatChordReadout(null, [60])).toBe('---');
  });

  it('returns traditional name only when no active pitches', () => {
    expect(formatChordReadout('Bb maj6 / G min7', [])).toBe('Bb maj6 / G min7');
  });

  it('combines traditional name and playing notes', () => {
    expect(formatChordReadout('Bb maj6 / G min7', [58, 62, 65, 69])).toBe(
      'Bb maj6 / G min7 - Bb3 D4 F4 A4'
    );
  });
});
