import { describe, it, expect } from 'vitest';
import { ChordManager } from './ChordManager';
import {
  spellChordDegrees,
  buildDegreeSpellingMap,
  spellMidiNote,
} from './chordSpelling';
import { formatPlayingNotes } from './formatPlayingNotes';

function branchDegreeMap() {
  const branch = new ChordManager().getChordByName('Branch')!;
  return buildDegreeSpellingMap(branch);
}

describe('spellChordDegrees', () => {
  it('spells D maj6 with F# not Gb', () => {
    const degrees = spellChordDegrees(2, ' maj6');
    expect(degrees.map((d) => d.noteName)).toEqual(['D', 'F#', 'A', 'B']);
  });

  it('spells Bb maj6 with flat-friendly names', () => {
    expect(spellChordDegrees(10, ' maj6').map((d) => d.noteName)).toEqual([
      'Bb',
      'D',
      'F',
      'G',
    ]);
  });

  it('spells D min6', () => {
    expect(spellChordDegrees(2, ' min6').map((d) => d.noteName)).toEqual([
      'D',
      'F',
      'A',
      'Bb',
    ]);
  });

  it('spells diminished with natural or flat names only', () => {
    expect(spellChordDegrees(10, ' diminished').map((d) => d.noteName)).toEqual(
      ['Bb', 'Db', 'E', 'G']
    );
    expect(spellChordDegrees(2, ' diminished').map((d) => d.noteName)).toEqual(
      ['D', 'F', 'Ab', 'B']
    );
  });

  it('allows mixed accidentals for 7b5', () => {
    expect(spellChordDegrees(4, '7b5').map((d) => d.noteName)).toEqual([
      'E',
      'G#',
      'Bb',
      'D',
    ]);
  });

  it('spells Bb7b5 for Sand-Storm at default tonal center', () => {
    const manager = new ChordManager();
    const sandStorm = manager.getChordByName('Sand-Storm')!;
    const map = buildDegreeSpellingMap(sandStorm)!;
    expect(map.get(10)).toBe('Bb');
    expect(map.get(2)).toBe('D');
    expect(map.get(4)).toBe('E');
    expect(map.get(8)).toBe('Ab');
  });
});

describe('spellMidiNote', () => {
  it('uses chord spelling when pitch class matches a degree', () => {
    const map = branchDegreeMap();
    expect(spellMidiNote(62, map)).toBe('D4');
    expect(spellMidiNote(65, map)).toBe('F4');
  });

  it('falls back to flat spelling for borrowed pitch classes', () => {
    const map = branchDegreeMap();
    expect(spellMidiNote(64, map)).toBe('E4');
  });
});

describe('formatPlayingNotes with chord context', () => {
  it('uses tertian spelling for D maj6', () => {
    // Minimal chord shape for formatPlayingNotes tertian spelling path.
    const dMaj6 = {
      name: 'Test',
      originalPitches: [2, 6, 9, 11],
      pitches: [2, 6, 9, 11],
      traditionalName: 'D maj6',
      quality: ' maj6',
      rootPositionIndex: 0,
    };
    expect(formatPlayingNotes([62, 66, 69, 71], dMaj6)).toBe(
      'D4 F#4 A4 B4'
    );
  });

  it('keeps flat-only spelling when chord is omitted', () => {
    expect(formatPlayingNotes([62, 66, 69, 71])).toBe('D4 Gb4 A4 B4');
  });
});
