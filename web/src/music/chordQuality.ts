/** Suffix-to-quality map; longest suffixes must be listed before shorter ones. */
const CHORD_QUALITY_SUFFIXES: [string, string][] = [
  ['-Fire', '7b5'],
  ['Sand-Storm', '7b5'],
  ['Fire-Storm', '7b5'],
  ['Earth', ' diminished'],
  ['Wind', ' diminished'],
  ['Fire', ' diminished'],
  ['Trunk', ' min6'],
  ['Smoke', ' min6'],
  ['Magma', ' min6'],
  ['Branch', ' maj6'],
  ['Ember', ' maj6'],
  ['Glass', ' maj6'],
  ['Leaf', '7'],
  ['Flame', '7'],
  ['Charcoal', '7'],
];

export function getChordQuality(chordName: string): string {
  for (const [suffix, quality] of CHORD_QUALITY_SUFFIXES) {
    if (chordName.endsWith(suffix)) {
      return quality;
    }
  }
  return '';
}
