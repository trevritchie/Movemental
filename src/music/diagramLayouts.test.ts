import { describe, expect, it } from 'vitest';
import {
  DIAGRAM_LAYOUT_OPTIONS,
  isChordEnabledInLayout,
  isDiagramLayoutMode,
  MAJOR_LAYOUT_CHORDS,
} from './diagramLayouts';

describe('diagramLayouts', () => {
  it('lists Complete Geometry and Major options', () => {
    expect(DIAGRAM_LAYOUT_OPTIONS.map((o) => o.value)).toEqual([
      'complete_geometry',
      'major',
    ]);
    expect(DIAGRAM_LAYOUT_OPTIONS[0].label).toBe('Complete Geometry');
    expect(DIAGRAM_LAYOUT_OPTIONS[1].label).toBe('Major');
  });

  it('validates diagram layout mode strings', () => {
    expect(isDiagramLayoutMode('complete_geometry')).toBe(true);
    expect(isDiagramLayoutMode('major')).toBe(true);
    expect(isDiagramLayoutMode('minor')).toBe(false);
    expect(isDiagramLayoutMode(null)).toBe(false);
  });

  it('enables every chord in Complete Geometry', () => {
    expect(isChordEnabledInLayout('Trunk', 'complete_geometry')).toBe(true);
    expect(isChordEnabledInLayout('Brother Branch', 'complete_geometry')).toBe(
      true,
    );
    expect(isChordEnabledInLayout('Fire', 'complete_geometry')).toBe(true);
  });

  it('keeps parents and Major allowlist; disables siblings and others', () => {
    for (const parent of ['Earth', 'Wind', 'Fire']) {
      expect(isChordEnabledInLayout(parent, 'major')).toBe(true);
    }
    for (const name of MAJOR_LAYOUT_CHORDS) {
      expect(isChordEnabledInLayout(name, 'major')).toBe(true);
    }

    expect(isChordEnabledInLayout('Brother Branch', 'major')).toBe(false);
    expect(isChordEnabledInLayout('Twin Ember', 'major')).toBe(false);
    expect(isChordEnabledInLayout('Sister Glass', 'major')).toBe(false);
    expect(isChordEnabledInLayout('Trunk', 'major')).toBe(false);
    expect(isChordEnabledInLayout('Smoke', 'major')).toBe(false);
    // Fire parent stays on; Flame is the Dominant child, not Fire.
    expect(isChordEnabledInLayout('Flame', 'major')).toBe(true);
  });
});
