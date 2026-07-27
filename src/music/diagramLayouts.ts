/**
 * Diagram layout modes: which chords are playable on the elemental diagram.
 *
 * Complete Geometry exposes every chord. Scale layouts keep the three parents
 * plus chords whose pitch classes fit the layout's allowlist at center C.
 */
import type { DiagramLayoutMode } from './sessionModes';
import { PARENT_ELEMENT_NAMES } from './elementTokens';

export type { DiagramLayoutMode } from './sessionModes';

export const DEFAULT_DIAGRAM_LAYOUT_MODE: DiagramLayoutMode =
  'complete_geometry';

export const DIAGRAM_LAYOUT_OPTIONS: readonly {
  value: DiagramLayoutMode;
  label: string;
}[] = [
  { value: 'complete_geometry', label: 'Complete Geometry' },
  { value: 'major', label: 'Major' },
  { value: 'natural_minor', label: 'Natural Minor' },
  { value: 'minor', label: 'Minor' },
  { value: 'blues', label: 'Blues' },
  { value: 'jazz_blues', label: 'Jazz Blues' },
  { value: 'rhythm_changes', label: 'Rhythm Changes' },
] as const;

/**
 * Major layout: pitch classes {0, 2, 4, 5, 7, 9, 11} at center C.
 * Parents are always enabled separately.
 */
export const MAJOR_LAYOUT_CHORDS: ReadonlySet<string> = new Set([
  'Branch',
  'Glass',
  'Magma',
  'Flame',
  'Ember',
]);

/**
 * Natural Minor: pitch classes {0, 2, 3, 5, 7, 8, 10} at center C.
 * Parents are always enabled separately.
 */
export const NATURAL_MINOR_LAYOUT_CHORDS: ReadonlySet<string> = new Set([
  'Brother Branch',
  'Brother Ember',
  'Brother Flame',
  'Brother Magma',
  'Brother Glass',
]);

/**
 * Minor (composite): pitch classes {0, 2, 3, 5, 7, 8, 9, 10, 11} at center C.
 * Parents are always enabled separately.
 */
export const MINOR_LAYOUT_CHORDS: ReadonlySet<string> = new Set([
  'Trunk',
  'Brother Branch',
  'Brother Ember',
  'Flame',
  'Brother Flame',
  'Magma',
  'Brother Magma',
  'Twin Magma',
  'Glass',
  'Brother Glass',
  'Forest-Fire',
  'Twin Forest-Fire',
  'Charcoal',
]);

/**
 * Blues beginner subset (curated; not a full pitch-class scale filter).
 * Parents are always enabled separately.
 */
export const BLUES_LAYOUT_CHORDS: ReadonlySet<string> = new Set([
  'Leaf',
  'Charcoal',
  'Flame',
]);

/**
 * Jazz Blues subset (curated; not a full pitch-class scale filter).
 * Parents are always enabled separately.
 */
export const JAZZ_BLUES_LAYOUT_CHORDS: ReadonlySet<string> = new Set([
  'Leaf',
  'Twin Leaf',
  'Sister Leaf',
  'Branch',
  'Charcoal',
  'Glass',
  'Smoke',
  'Flame',
  'Twin Flame',
  'Ember',
  'Brother Ember',
]);

/**
 * Rhythm Changes subset (curated; not a full pitch-class scale filter).
 * Parents are always enabled separately.
 */
export const RHYTHM_CHANGES_LAYOUT_CHORDS: ReadonlySet<string> = new Set([
  'Branch',
  'Leaf',
  'Sister Leaf',
  'Glass',
  'Brother Glass',
  'Magma',
  'Brother Magma',
  'Charcoal',
  'Sister Charcoal',
  'Ember',
  'Flame',
  'Brother Flame',
  'Twin Flame',
  'Sister Flame',
]);

const PARENT_SET: ReadonlySet<string> = new Set(PARENT_ELEMENT_NAMES);

const LAYOUT_ALLOWLISTS: Record<
  Exclude<DiagramLayoutMode, 'complete_geometry'>,
  ReadonlySet<string>
> = {
  major: MAJOR_LAYOUT_CHORDS,
  natural_minor: NATURAL_MINOR_LAYOUT_CHORDS,
  minor: MINOR_LAYOUT_CHORDS,
  blues: BLUES_LAYOUT_CHORDS,
  jazz_blues: JAZZ_BLUES_LAYOUT_CHORDS,
  rhythm_changes: RHYTHM_CHANGES_LAYOUT_CHORDS,
};

const DIAGRAM_LAYOUT_MODE_SET: ReadonlySet<string> = new Set(
  DIAGRAM_LAYOUT_OPTIONS.map((option) => option.value),
);

export function isDiagramLayoutMode(
  value: unknown,
): value is DiagramLayoutMode {
  return typeof value === 'string' && DIAGRAM_LAYOUT_MODE_SET.has(value);
}

/**
 * Whether a chord name may be selected and played in the given layout.
 * Parents are enabled in every layout.
 */
export function isChordEnabledInLayout(
  chordName: string,
  mode: DiagramLayoutMode,
): boolean {
  if (mode === 'complete_geometry') return true;
  if (PARENT_SET.has(chordName)) return true;
  return LAYOUT_ALLOWLISTS[mode].has(chordName);
}
