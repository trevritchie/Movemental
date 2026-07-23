import { beforeEach, describe, expect, it } from 'vitest';
import { chordManager } from './ChordManager';
import { PARENT_ELEMENT_NAMES } from './elementTokens';
import {
  BLUES_LAYOUT_CHORDS,
  DIAGRAM_LAYOUT_OPTIONS,
  DOMINANT_SEVENTH_DIMINISHED_LAYOUT_CHORDS,
  DOMINANT_SEVENTH_FLAT_FIVE_DIMINISHED_LAYOUT_CHORDS,
  isChordEnabledInLayout,
  isDiagramLayoutMode,
  JAZZ_BLUES_LAYOUT_CHORDS,
  MAJOR_LAYOUT_CHORDS,
  MAJOR_SIXTH_DIMINISHED_LAYOUT_CHORDS,
  MINOR_LAYOUT_CHORDS,
  MINOR_SIXTH_DIMINISHED_LAYOUT_CHORDS,
  NATURAL_MINOR_LAYOUT_CHORDS,
  RHYTHM_CHANGES_LAYOUT_CHORDS,
  type DiagramLayoutMode,
} from './diagramLayouts';

const PARENT_SET = new Set<string>(PARENT_ELEMENT_NAMES);

/** Scale pitch-class sets at center C, matching diagramLayouts comments. */
const SCALE_LAYOUT_PITCH_CLASSES: Partial<
  Record<DiagramLayoutMode, ReadonlySet<number>>
> = {
  major: new Set([0, 2, 4, 5, 7, 9, 11]),
  natural_minor: new Set([0, 2, 3, 5, 7, 8, 10]),
  minor: new Set([0, 2, 3, 5, 7, 8, 9, 10, 11]),
  major_sixth_diminished: new Set([0, 2, 4, 5, 7, 8, 9, 11]),
  minor_sixth_diminished: new Set([0, 2, 3, 5, 7, 8, 9, 11]),
  dominant_seventh_diminished: new Set([0, 2, 4, 5, 7, 8, 9, 10]),
  dominant_seventh_flat_five_diminished: new Set([0, 2, 4, 5, 6, 8, 9, 10]),
};

function chordPitchClasses(name: string): Set<number> {
  const chord = chordManager.getChordByName(name);
  if (!chord) {
    throw new Error(`Missing chord: ${name}`);
  }
  return new Set(
    chord.originalPitches.map((pitch) => ((pitch % 12) + 12) % 12),
  );
}

function isPitchClassSubset(
  chordPcs: Set<number>,
  scalePcs: ReadonlySet<number>,
): boolean {
  for (const pc of chordPcs) {
    if (!scalePcs.has(pc)) {
      return false;
    }
  }
  return true;
}

function chordsMatchingScale(scalePcs: ReadonlySet<number>): string[] {
  return chordManager
    .getAllChordNames()
    .filter((name) => !PARENT_SET.has(name))
    .filter((name) => isPitchClassSubset(chordPitchClasses(name), scalePcs))
    .sort();
}

describe('diagramLayouts', () => {
  beforeEach(() => {
    chordManager.configureTonalSpace(0, chordManager.getOctaveRange());
  });

  it('lists layout options with blues family before sixth-diminished', () => {
    expect(DIAGRAM_LAYOUT_OPTIONS.map((o) => o.value)).toEqual([
      'complete_geometry',
      'major',
      'natural_minor',
      'minor',
      'blues',
      'jazz_blues',
      'rhythm_changes',
      'major_sixth_diminished',
      'minor_sixth_diminished',
      'dominant_seventh_diminished',
      'dominant_seventh_flat_five_diminished',
    ]);
    expect(DIAGRAM_LAYOUT_OPTIONS.map((o) => o.label)).toEqual([
      'Complete Geometry',
      'Major',
      'Natural Minor',
      'Minor',
      'Blues',
      'Jazz Blues',
      'Rhythm Changes',
      'Major Sixth Diminished',
      'Minor Sixth Diminished',
      'Dominant Seventh Diminished',
      'Dominant Seventh Flat Five Diminished',
    ]);
  });

  it('validates diagram layout mode strings', () => {
    for (const option of DIAGRAM_LAYOUT_OPTIONS) {
      expect(isDiagramLayoutMode(option.value)).toBe(true);
    }
    expect(isDiagramLayoutMode('composite_minor')).toBe(false);
    expect(isDiagramLayoutMode('harmonic_melodic_minor')).toBe(false);
    expect(isDiagramLayoutMode(null)).toBe(false);
  });

  it('enables every chord in Complete Geometry', () => {
    expect(isChordEnabledInLayout('Trunk', 'complete_geometry')).toBe(true);
    expect(isChordEnabledInLayout('Brother Branch', 'complete_geometry')).toBe(
      true,
    );
    expect(isChordEnabledInLayout('Fire', 'complete_geometry')).toBe(true);
  });

  it('keeps parents on for every restricted layout', () => {
    for (const option of DIAGRAM_LAYOUT_OPTIONS) {
      if (option.value === 'complete_geometry') continue;
      for (const parent of PARENT_ELEMENT_NAMES) {
        expect(isChordEnabledInLayout(parent, option.value)).toBe(true);
      }
    }
  });

  it('matches scale pitch-class contracts at center C', () => {
    for (const [mode, scalePcs] of Object.entries(SCALE_LAYOUT_PITCH_CLASSES)) {
      const expected = chordsMatchingScale(scalePcs);
      const allowlist = expected.filter((name) =>
        isChordEnabledInLayout(name, mode as DiagramLayoutMode),
      );
      expect(allowlist).toEqual(expected);
      for (const name of chordManager.getAllChordNames()) {
        if (PARENT_SET.has(name)) continue;
        const enabled = isChordEnabledInLayout(
          name,
          mode as DiagramLayoutMode,
        );
        const fits = isPitchClassSubset(chordPitchClasses(name), scalePcs);
        expect(enabled).toBe(fits);
      }
    }
  });

  it('keeps Major allowlist and disables outsiders', () => {
    expect([...MAJOR_LAYOUT_CHORDS].sort()).toEqual([
      'Branch',
      'Ember',
      'Flame',
      'Glass',
      'Magma',
    ]);
    for (const name of MAJOR_LAYOUT_CHORDS) {
      expect(isChordEnabledInLayout(name, 'major')).toBe(true);
    }
    expect(isChordEnabledInLayout('Trunk', 'major')).toBe(false);
    expect(isChordEnabledInLayout('Sister Flame', 'major')).toBe(false);
  });

  it('keeps Natural Minor allowlist', () => {
    for (const name of NATURAL_MINOR_LAYOUT_CHORDS) {
      expect(isChordEnabledInLayout(name, 'natural_minor')).toBe(true);
    }
    expect(isChordEnabledInLayout('Flame', 'natural_minor')).toBe(false);
  });

  it('keeps Minor (composite) allowlist', () => {
    for (const name of MINOR_LAYOUT_CHORDS) {
      expect(isChordEnabledInLayout(name, 'minor')).toBe(true);
    }
    expect(isChordEnabledInLayout('Branch', 'minor')).toBe(false);
    expect(isChordEnabledInLayout('Ember', 'minor')).toBe(false);
  });

  it('treats Blues, Jazz Blues, and Rhythm Changes as curated subsets', () => {
    for (const name of BLUES_LAYOUT_CHORDS) {
      expect(isChordEnabledInLayout(name, 'blues')).toBe(true);
    }
    expect(isChordEnabledInLayout('Branch', 'blues')).toBe(false);
    expect(isChordEnabledInLayout('Glass', 'blues')).toBe(false);
    expect(isChordEnabledInLayout('Ember', 'blues')).toBe(false);

    for (const name of JAZZ_BLUES_LAYOUT_CHORDS) {
      expect(isChordEnabledInLayout(name, 'jazz_blues')).toBe(true);
    }
    expect(isChordEnabledInLayout('Brother Leaf', 'jazz_blues')).toBe(false);
    expect(isChordEnabledInLayout('Fire-Storm', 'jazz_blues')).toBe(false);
    expect(isChordEnabledInLayout('Twin Fire-Storm', 'jazz_blues')).toBe(false);
    expect(isChordEnabledInLayout('Sister Ember', 'jazz_blues')).toBe(false);

    for (const name of RHYTHM_CHANGES_LAYOUT_CHORDS) {
      expect(isChordEnabledInLayout(name, 'rhythm_changes')).toBe(true);
    }
    expect(isChordEnabledInLayout('Twin Leaf', 'rhythm_changes')).toBe(false);
    expect(isChordEnabledInLayout('Smoke', 'rhythm_changes')).toBe(false);
    expect(isChordEnabledInLayout('Brother Charcoal', 'rhythm_changes')).toBe(
      false,
    );
  });

  it('keeps Major Sixth Diminished allowlist', () => {
    for (const name of MAJOR_SIXTH_DIMINISHED_LAYOUT_CHORDS) {
      expect(isChordEnabledInLayout(name, 'major_sixth_diminished')).toBe(true);
    }
    expect(isChordEnabledInLayout('Trunk', 'major_sixth_diminished')).toBe(
      false,
    );
    expect(isChordEnabledInLayout('Leaf', 'major_sixth_diminished')).toBe(
      false,
    );
  });

  it('keeps Minor Sixth Diminished allowlist', () => {
    for (const name of MINOR_SIXTH_DIMINISHED_LAYOUT_CHORDS) {
      expect(isChordEnabledInLayout(name, 'minor_sixth_diminished')).toBe(true);
    }
    expect(
      isChordEnabledInLayout('Brother Branch', 'minor_sixth_diminished'),
    ).toBe(false);
    expect(
      isChordEnabledInLayout('Brother Flame', 'minor_sixth_diminished'),
    ).toBe(false);
  });

  it('keeps Dominant Seventh Diminished allowlist', () => {
    for (const name of DOMINANT_SEVENTH_DIMINISHED_LAYOUT_CHORDS) {
      expect(
        isChordEnabledInLayout(name, 'dominant_seventh_diminished'),
      ).toBe(true);
    }
    expect(
      isChordEnabledInLayout('Ember', 'dominant_seventh_diminished'),
    ).toBe(false);
    expect(
      isChordEnabledInLayout('Flame', 'dominant_seventh_diminished'),
    ).toBe(false);
  });

  it('keeps Dominant Seventh Flat Five Diminished allowlist', () => {
    for (const name of DOMINANT_SEVENTH_FLAT_FIVE_DIMINISHED_LAYOUT_CHORDS) {
      expect(
        isChordEnabledInLayout(
          name,
          'dominant_seventh_flat_five_diminished',
        ),
      ).toBe(true);
    }
    expect(
      isChordEnabledInLayout('Branch', 'dominant_seventh_flat_five_diminished'),
    ).toBe(false);
    expect(
      isChordEnabledInLayout('Trunk', 'dominant_seventh_flat_five_diminished'),
    ).toBe(false);
  });
});
