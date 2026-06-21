// config.ts
// Ported configuration from Movemental config.py

import type { VoiceLeadingMode } from '../context/types';

export const NOTE_NAMES_FLAT = [
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"
];

export const NOTE_NAMES_SHARP = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
];

// Default configurations
export const DEFAULT_TONAL_CENTER_OFFSET = 10; // Bb
export const DEFAULT_OCTAVE_RANGE = 2;
export const MIN_OCTAVE_RANGE = 1;
export const MAX_OCTAVE_RANGE = 4;
export const OCTAVE_RANGE_OPTIONS = Array.from(
  { length: MAX_OCTAVE_RANGE - MIN_OCTAVE_RANGE + 1 },
  (_, i) => MIN_OCTAVE_RANGE + i
);
export const DEFAULT_VOICING = "Drop 2 & 4";
export const DEFAULT_VOICE_LEADING_MODE: VoiceLeadingMode = 'root_position';
export const DEFAULT_CHORD_DURATION = "2n"; // Half note in Tone.js

export const VOICING_TO_INDICES: Record<string, number[]> = {
  "Close": [],
  "Drop 2": [1],
  "Drop 3": [1, 2],
  "Drop 2 & 4": [1, 3]
};

// Intervals
export const OCTAVE = 12;

// Borrowing system relationships
export const ELEMENTAL_RELATIONSHIPS: Record<string, string[]> = {
  "Earth": ["Wind", "Fire"],
  "Wind": ["Earth", "Fire"],
  "Fire": ["Earth", "Wind"],

  // Earth+Wind chords -> opposite is Fire
  "Trunk": ["Fire"],
  "Brother Trunk": ["Fire"],
  "Twin Trunk": ["Fire"],
  "Sister Trunk": ["Fire"],
  "Branch": ["Fire"],
  "Brother Branch": ["Fire"],
  "Twin Branch": ["Fire"],
  "Sister Branch": ["Fire"],
  "Sand-Storm": ["Fire"],
  "Brother Sand-Storm": ["Fire"],
  "Twin Sand-Storm": ["Fire"],
  "Sister Sand-Storm": ["Fire"],
  "Leaf": ["Fire"],
  "Brother Leaf": ["Fire"],
  "Twin Leaf": ["Fire"],
  "Sister Leaf": ["Fire"],

  // Wind+Fire chords -> opposite is Earth
  "Smoke": ["Earth"],
  "Brother Smoke": ["Earth"],
  "Twin Smoke": ["Earth"],
  "Sister Smoke": ["Earth"],
  "Ember": ["Earth"],
  "Brother Ember": ["Earth"],
  "Twin Ember": ["Earth"],
  "Sister Ember": ["Earth"],
  "Fire-Storm": ["Earth"],
  "Brother Fire-Storm": ["Earth"],
  "Twin Fire-Storm": ["Earth"],
  "Sister Fire-Storm": ["Earth"],
  "Flame": ["Earth"],
  "Brother Flame": ["Earth"],
  "Twin Flame": ["Earth"],
  "Sister Flame": ["Earth"],

  // Fire+Earth chords -> opposite is Wind
  "Magma": ["Wind"],
  "Brother Magma": ["Wind"],
  "Twin Magma": ["Wind"],
  "Sister Magma": ["Wind"],
  "Glass": ["Wind"],
  "Brother Glass": ["Wind"],
  "Twin Glass": ["Wind"],
  "Sister Glass": ["Wind"],
  "Forest-Fire": ["Wind"],
  "Brother Forest-Fire": ["Wind"],
  "Twin Forest-Fire": ["Wind"],
  "Sister Forest-Fire": ["Wind"],
  "Charcoal": ["Wind"],
  "Brother Charcoal": ["Wind"],
  "Twin Charcoal": ["Wind"],
  "Sister Charcoal": ["Wind"]
};

// Map line positions to chord note indices (sorted from low to high)
export const NOTE_POSITION_MAPPING: Record<number, number> = {
  1: 0,  // Line 1 -> Lowest note (index 0)
  2: 1,  // Line 2 -> Second lowest note (index 1)
  3: 2,  // Line 3 -> Third lowest note (index 2)
  4: 3   // Line 4 -> Highest note (index 3)
};

// Base MIDI pitches for C4
export const C4 = 60;
export const CS4 = 61;
export const DF4 = 61;
export const D4 = 62;
export const DS4 = 63;
export const EF4 = 63;
export const E4 = 64;
export const F4 = 65;
export const FS4 = 66;
export const GF4 = 66;
export const G4 = 67;
export const GS4 = 68;
export const AF4 = 68;
export const A4 = 69;
export const AS4 = 70;
export const BF4 = 70;
export const B4 = 71;

export const C5 = 72;
export const CF5 = 71;
export const CS5 = 73;
export const DF5 = 73;
export const D5 = 74;
export const DS5 = 75;
export const EF5 = 75;
export const E5 = 76;
export const F5 = 77;
export const FS5 = 78;
export const GF5 = 78;
export const G5 = 79;
export const GS5 = 80;
export const AF5 = 80;
export const A5 = 81;
export const AS5 = 82;
export const BF5 = 82;
export const B5 = 83;

export const A3 = 57;
export const B3 = 59;
