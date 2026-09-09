/**
 * Simple Major Triads: Roman-numeral buttons mapped onto elemental axes.
 *
 * Pitch model (live, do not assume a second encoding):
 * - Dictionary templates store MIDI note numbers (`originalPitches`, C4 = 60).
 * - After `ChordManager.configureTonalSpace`, `chord.pitches` is the sorted
 *   set of pitch classes 0..11:
 *   `((midi % 12) + (tonalCenterOffset % 12)) % 12`
 * - Matching uses those live `chord.pitches` values via `normalizePitchClass`
 *   / `relativePitchClass` — the same helpers as chemistry and bass labels.
 *
 * Source chords are taken from `MAJOR_LAYOUT_CHORDS` on the issue's axis,
 * excluding 7th / 7b5 qualities unless a chord's PCs are exactly the triad.
 * Extra PCs (the added 6th) are muted through the existing borrowing overlay
 * so RN buttons sound strict triads without a new playback pipeline.
 */
import {
  cloneBorrowingState,
  getRootPositionMapping,
  type BorrowingState,
} from './BorrowingLogic';
import { chordManager, type Chord } from './ChordManager';
import { getChordQuality } from './chordQuality';
import { NOTE_NAMES_FLAT } from './config';
import { MAJOR_LAYOUT_CHORDS } from './diagramLayouts';
import { AXIS_PARENTS, CHORD_TO_GROUP } from './diagramMetadata';
import {
  getChordRootPitchClass,
  normalizePitchClass,
  relativePitchClass,
} from './pitchClass';

export type SimpleMajorTriadId =
  | 'I'
  | 'ii'
  | 'iii'
  | 'IV'
  | 'V'
  | 'vi'
  | 'vii_dim';

export type SimpleTriadAxisId = 'earth_wind' | 'earth_fire' | 'wind_fire';

export type SimpleTriadQuality = 'major' | 'minor' | 'diminished';

export interface SimpleMajorTriadDef {
  id: SimpleMajorTriadId;
  roman: string;
  axis: SimpleTriadAxisId;
  /** Scale-degree pitch classes relative to the tonal center (I = 0). */
  relativePcs: readonly [number, number, number];
  /** Triad root as a relative pitch class (I = 0, ii = 2, ...). */
  triadRootRel: number;
  quality: SimpleTriadQuality;
}

export interface ResolvedSimpleMajorTriad {
  id: SimpleMajorTriadId;
  roman: string;
  axis: SimpleTriadAxisId;
  quality: SimpleTriadQuality;
  chordName: string;
  /** Absolute pitch classes 0..11 at the current tonal center. */
  triadPitchClasses: readonly number[];
  extraPitchClasses: readonly number[];
}

export const SIMPLE_TRIAD_AXIS_LABELS: Record<SimpleTriadAxisId, string> = {
  earth_wind: 'Earth-Wind',
  earth_fire: 'Earth-Fire',
  wind_fire: 'Wind-Fire',
};

/**
 * Issue #94 axis grouping, aligned with harmonic-function edges:
 * Earth-Wind = tonic (I vi), Earth-Fire = subdominant (ii IV vii°),
 * Wind-Fire = dominant (iii V).
 */
export const SIMPLE_MAJOR_TRIAD_DEFS: readonly SimpleMajorTriadDef[] = [
  {
    id: 'I',
    roman: 'I',
    axis: 'earth_wind',
    relativePcs: [0, 4, 7],
    triadRootRel: 0,
    quality: 'major',
  },
  {
    id: 'vi',
    roman: 'vi',
    axis: 'earth_wind',
    relativePcs: [9, 0, 4],
    triadRootRel: 9,
    quality: 'minor',
  },
  {
    id: 'ii',
    roman: 'ii',
    axis: 'earth_fire',
    relativePcs: [2, 5, 9],
    triadRootRel: 2,
    quality: 'minor',
  },
  {
    id: 'IV',
    roman: 'IV',
    axis: 'earth_fire',
    relativePcs: [5, 9, 0],
    triadRootRel: 5,
    quality: 'major',
  },
  {
    id: 'vii_dim',
    roman: 'vii°',
    axis: 'earth_fire',
    relativePcs: [11, 2, 5],
    triadRootRel: 11,
    quality: 'diminished',
  },
  {
    id: 'iii',
    roman: 'iii',
    axis: 'wind_fire',
    relativePcs: [4, 7, 11],
    triadRootRel: 4,
    quality: 'minor',
  },
  {
    id: 'V',
    roman: 'V',
    axis: 'wind_fire',
    relativePcs: [7, 11, 2],
    triadRootRel: 7,
    quality: 'major',
  },
] as const;

const SEVENTH_QUALITIES = new Set(['7', '7b5']);

const AXIS_ID_BY_PARENT_PAIR: Record<string, SimpleTriadAxisId> = {
  'Earth-Wind': 'earth_wind',
  'Wind-Fire': 'wind_fire',
  'Fire-Earth': 'earth_fire',
};

const TRIAD_DEFS_BY_ID: ReadonlyMap<SimpleMajorTriadId, SimpleMajorTriadDef> =
  new Map(SIMPLE_MAJOR_TRIAD_DEFS.map((def) => [def.id, def]));

function axisIdForChordName(chordName: string): SimpleTriadAxisId | null {
  const group = CHORD_TO_GROUP.get(chordName);
  if (!group) return null;
  const parents = AXIS_PARENTS[group];
  if (!parents) return null;
  return AXIS_ID_BY_PARENT_PAIR[`${parents.p1}-${parents.p2}`] ?? null;
}

function livePitchClassSet(chord: Chord): Set<number> {
  return new Set(chord.pitches.map((pitch) => normalizePitchClass(pitch)));
}

function absoluteTriadPcs(
  relativePcs: readonly number[],
  tonalCenter: number,
): number[] {
  return relativePcs.map((rel) => normalizePitchClass(rel + tonalCenter));
}

function isPitchClassSubset(
  needed: readonly number[],
  available: ReadonlySet<number>,
): boolean {
  return needed.every((pc) => available.has(pc));
}

function isSeventhQuality(chordName: string): boolean {
  return SEVENTH_QUALITIES.has(getChordQuality(chordName));
}

/** True when the live set is exactly the triad PCs (same members and size). */
function isExactTriadMatch(
  livePcs: ReadonlySet<number>,
  triadPcs: readonly number[],
): boolean {
  return (
    livePcs.size === triadPcs.length &&
    isPitchClassSubset([...livePcs], new Set(triadPcs))
  );
}

/**
 * Prefer the host whose root is the triad root, then fewer extra PCs,
 * then a stable name order.
 */
function compareSourceChords(
  a: Chord,
  b: Chord,
  triadRoot: number,
  triadCount: number,
): number {
  const aRoot = getChordRootPitchClass(a) === triadRoot ? 0 : 1;
  const bRoot = getChordRootPitchClass(b) === triadRoot ? 0 : 1;
  if (aRoot !== bRoot) return aRoot - bRoot;
  const aExtra = livePitchClassSet(a).size - triadCount;
  const bExtra = livePitchClassSet(b).size - triadCount;
  if (aExtra !== bExtra) return aExtra - bExtra;
  return a.name.localeCompare(b.name);
}

/**
 * Candidate pool: Major-layout names on the requested axis, skipping 7th
 * qualities unless the live PC set is exactly the triad (none today).
 */
function sourceCandidates(
  def: SimpleMajorTriadDef,
  triadPcs: readonly number[],
): Chord[] {
  const matches: Chord[] = [];
  for (const name of MAJOR_LAYOUT_CHORDS) {
    if (axisIdForChordName(name) !== def.axis) continue;
    const chord = chordManager.getChordByName(name);
    if (!chord) continue;
    const livePcs = livePitchClassSet(chord);
    if (!isPitchClassSubset(triadPcs, livePcs)) continue;
    if (isSeventhQuality(name) && !isExactTriadMatch(livePcs, triadPcs)) continue;
    matches.push(chord);
  }
  return matches;
}

function pickSourceChord(
  def: SimpleMajorTriadDef,
  triadPcs: readonly number[],
  tonalCenter: number,
): Chord | null {
  const candidates = sourceCandidates(def, triadPcs);
  if (candidates.length === 0) return null;

  const triadRoot = normalizePitchClass(def.triadRootRel + tonalCenter);
  candidates.sort((a, b) =>
    compareSourceChords(a, b, triadRoot, triadPcs.length),
  );
  return candidates[0] ?? null;
}

export function getSimpleMajorTriadDef(
  id: SimpleMajorTriadId,
): SimpleMajorTriadDef | undefined {
  return TRIAD_DEFS_BY_ID.get(id);
}

/** Map one Roman numeral to a live elemental chord at `tonalCenter`. */
export function resolveSimpleMajorTriad(
  id: SimpleMajorTriadId,
  tonalCenter: number,
): ResolvedSimpleMajorTriad | null {
  const def = getSimpleMajorTriadDef(id);
  if (!def) return null;

  const triadPitchClasses = absoluteTriadPcs(def.relativePcs, tonalCenter);
  const chord = pickSourceChord(def, triadPitchClasses, tonalCenter);
  if (!chord) return null;

  const extraPitchClasses = [...livePitchClassSet(chord)]
    .filter((pc) => !triadPitchClasses.includes(pc))
    .sort((a, b) => a - b);

  return {
    id: def.id,
    roman: def.roman,
    axis: def.axis,
    quality: def.quality,
    chordName: chord.name,
    triadPitchClasses,
    extraPitchClasses,
  };
}

export function resolveAllSimpleMajorTriads(
  tonalCenter: number,
): ResolvedSimpleMajorTriad[] {
  return SIMPLE_MAJOR_TRIAD_DEFS.flatMap((def) => {
    const resolved = resolveSimpleMajorTriad(def.id, tonalCenter);
    return resolved ? [resolved] : [];
  });
}

export function formatSimpleTriadCaption(
  def: SimpleMajorTriadDef,
  tonalCenter: number,
): string {
  const rootName = NOTE_NAMES_FLAT[normalizePitchClass(def.triadRootRel + tonalCenter)];
  switch (def.quality) {
    case 'minor':
      return `${rootName}m`;
    case 'diminished':
      return `${rootName}°`;
    default:
      return rootName;
  }
}

export function simpleTriadAriaLabel(
  def: SimpleMajorTriadDef,
  tonalCenter: number,
): string {
  const caption = formatSimpleTriadCaption(def, tonalCenter);
  return `${def.roman} ${def.quality} triad, ${caption}`;
}

/**
 * Force extra (non-triad) voices off so playback sounds the strict triad.
 * Triad-tone mute/borrow choices are left as-is.
 */
export function applySimpleTriadMutes(
  state: BorrowingState,
  chord: Chord,
  triadPitchClasses: readonly number[],
): BorrowingState {
  const keep = new Set(triadPitchClasses.map((pc) => normalizePitchClass(pc)));
  const next = cloneBorrowingState(state);
  const mapping = getRootPositionMapping(chord);
  for (let line = 1; line <= 4; line += 1) {
    const noteIndex = mapping[line];
    if (noteIndex === undefined || noteIndex >= chord.pitches.length) continue;
    const naturalPc = normalizePitchClass(chord.pitches[noteIndex]);
    if (!keep.has(naturalPc)) {
      next.noteStates[line] = 'off';
    }
  }
  return next;
}

export function applySimpleTriadMutesIfActive(
  state: BorrowingState,
  chord: Chord,
  triadId: SimpleMajorTriadId | null,
  tonalCenter: number,
): BorrowingState {
  if (!triadId) return state;
  const resolved = resolveSimpleMajorTriad(triadId, tonalCenter);
  if (!resolved || resolved.chordName !== chord.name) return state;
  return applySimpleTriadMutes(state, chord, resolved.triadPitchClasses);
}

/** Relative PC of a live chord pitch at the given tonal center. */
export function relativeChordPitchClasses(
  chord: Chord,
  tonalCenter: number,
): number[] {
  return chord.pitches.map((pitch) => relativePitchClass(pitch, tonalCenter));
}
