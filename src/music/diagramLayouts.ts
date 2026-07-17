/**
 * Diagram layout modes: which chords are playable on the elemental diagram.
 *
 * Complete Geometry exposes every chord. Major is a beginner allowlist that
 * keeps the three parents plus a small major-friendly subset.
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
] as const;

/**
 * Major layout allowlist (base names only). Brother/Twin/Sister variants are
 * not included. Parents are always enabled separately.
 */
export const MAJOR_LAYOUT_CHORDS: ReadonlySet<string> = new Set([
  'Branch',
  'Glass',
  'Magma',
  'Flame',
  'Ember',
]);

const PARENT_SET: ReadonlySet<string> = new Set(PARENT_ELEMENT_NAMES);

export function isDiagramLayoutMode(
  value: unknown,
): value is DiagramLayoutMode {
  return value === 'complete_geometry' || value === 'major';
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
  return MAJOR_LAYOUT_CHORDS.has(chordName);
}
