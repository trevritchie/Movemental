import { chordManager } from './ChordManager';
import { BASE_GROUPS, SLICE_VARIANTS } from './diagramMetadata';
import { DIAGRAM_VIEW_W, DIAGRAM_VIEW_H } from './diagramLayout';

export interface DiagramNodeRadii {
  rMain: number;
  rGroup: number;
}

export interface DiagramNodePosition {
  id: string;
  x: number;
  y: number;
  kind: 'primary' | 'group';
}

/** Main node glow circle uses r * 1.2 in ElementalDiagram. */
export const PRIMARY_GLOW_FACTOR = 1.2;

/** Group glow circle uses r * 1.25 in ElementalDiagram. */
export const GROUP_GLOW_FACTOR = 1.25;

/** Minimum gap between glow edges (viewBox units). */
export const DEFAULT_MIN_NODE_GAP = 8;

/** ViewBox inset so glow does not clip at edges. */
export const DEFAULT_VIEWBOX_MARGIN = 6;

/** Desktop radii: max rMain with glow-edge clearance (was 52/54). */
export const DESKTOP_NODE_RADII: DiagramNodeRadii = {
  rMain: 62,
  rGroup: 64,
};

/**
 * Compact radii: max rMain with core-circle clearance (glow halos may blend).
 * Replaces 100/102 which overlapped cores by ~38px at Trunk↔Charcoal.
 */
export const COMPACT_NODE_RADII: DiagramNodeRadii = {
  rMain: 78,
  rGroup: 80,
};

export type NodeClearanceMode = 'glow' | 'core';

export function primaryEffectiveRadius(rMain: number): number {
  return rMain * PRIMARY_GLOW_FACTOR;
}

export function groupEffectiveRadius(rGroup: number): number {
  return rGroup * GROUP_GLOW_FACTOR;
}

export function getDiagramNodePositions(): {
  primaries: DiagramNodePosition[];
  groups: DiagramNodePosition[];
} {
  const primaries: DiagramNodePosition[] = ['Earth', 'Wind', 'Fire'].map(
    (name) => {
      const coord = chordManager.getCoordinateForChord(name);
      if (!coord) throw new Error(`Missing coordinate for ${name}`);
      return {
        id: name,
        x: coord.x * DIAGRAM_VIEW_W,
        y: coord.y * DIAGRAM_VIEW_H,
        kind: 'primary' as const,
      };
    },
  );

  const groups: DiagramNodePosition[] = BASE_GROUPS.map((baseName) => {
    const chords = SLICE_VARIANTS.map((v) =>
      chordManager.getChordByName(v.prefix + baseName),
    );
    const coords = chords.map((chord) => {
      if (!chord) throw new Error(`Missing chord ${baseName}`);
      const coord = chordManager.getCoordinateForChord(chord.name);
      if (!coord) throw new Error(`Missing coordinate for ${chord.name}`);
      return {
        x: coord.x * DIAGRAM_VIEW_W,
        y: coord.y * DIAGRAM_VIEW_H,
      };
    });
    const cx = coords.reduce((sum, c) => sum + c.x, 0) / coords.length;
    const cy = coords.reduce((sum, c) => sum + c.y, 0) / coords.length;
    return { id: baseName, x: cx, y: cy, kind: 'group' as const };
  });

  return { primaries, groups };
}

export interface ClearanceResult {
  ok: boolean;
  minClearance: number;
  worstPair: string;
}

export function computeMinNodeClearance(
  radii: DiagramNodeRadii,
  mode: NodeClearanceMode = 'glow',
): ClearanceResult {
  const { primaries, groups } = getDiagramNodePositions();
  const rP =
    mode === 'glow'
      ? primaryEffectiveRadius(radii.rMain)
      : radii.rMain;
  const rG =
    mode === 'glow' ? groupEffectiveRadius(radii.rGroup) : radii.rGroup;

  let minClearance = Infinity;
  let worstPair = '';

  const consider = (
    a: DiagramNodePosition,
    ra: number,
    b: DiagramNodePosition,
    rb: number,
  ) => {
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const clearance = dist - ra - rb;
    if (clearance < minClearance) {
      minClearance = clearance;
      worstPair = `${a.id}↔${b.id}`;
    }
  };

  for (let i = 0; i < primaries.length; i += 1) {
    for (let j = i + 1; j < primaries.length; j += 1) {
      consider(primaries[i], rP, primaries[j], rP);
    }
  }

  for (const primary of primaries) {
    for (const group of groups) {
      consider(primary, rP, group, rG);
    }
  }

  for (let i = 0; i < groups.length; i += 1) {
    for (let j = i + 1; j < groups.length; j += 1) {
      consider(groups[i], rG, groups[j], rG);
    }
  }

  if (!Number.isFinite(minClearance)) {
    return { ok: false, minClearance: -Infinity, worstPair: 'none' };
  }

  return { ok: true, minClearance, worstPair };
}

export function fitsViewBox(
  radii: DiagramNodeRadii,
  margin = DEFAULT_VIEWBOX_MARGIN,
  mode: NodeClearanceMode = 'core',
): boolean {
  const { primaries, groups } = getDiagramNodePositions();
  const nodes = [
    ...primaries.map((node) => ({
      ...node,
      r:
        mode === 'glow'
          ? primaryEffectiveRadius(radii.rMain)
          : radii.rMain,
    })),
    ...groups.map((node) => ({
      ...node,
      r: mode === 'glow' ? groupEffectiveRadius(radii.rGroup) : radii.rGroup,
    })),
  ];

  return nodes.every(
    (node) =>
      node.x - node.r >= margin &&
      node.x + node.r <= DIAGRAM_VIEW_W - margin &&
      node.y - node.r >= margin &&
      node.y + node.r <= DIAGRAM_VIEW_H - margin,
  );
}

export function nodeLayoutIsValid(
  radii: DiagramNodeRadii,
  minGap = DEFAULT_MIN_NODE_GAP,
  margin = DEFAULT_VIEWBOX_MARGIN,
  clearanceMode: NodeClearanceMode = 'glow',
  boundsMode: NodeClearanceMode = 'core',
): boolean {
  const clearance = computeMinNodeClearance(radii, clearanceMode);
  return (
    clearance.minClearance >= minGap &&
    fitsViewBox(radii, margin, boundsMode)
  );
}

/**
 * Binary-search the largest rMain (rGroup = rMain * groupRatio) that satisfies
 * clearance and viewBox margin constraints.
 */
export function findMaxNodeRadii(options: {
  minGap?: number;
  margin?: number;
  groupRatio?: number;
  maxRMain?: number;
  clearanceMode?: NodeClearanceMode;
  boundsMode?: NodeClearanceMode;
}): DiagramNodeRadii {
  const minGap = options.minGap ?? DEFAULT_MIN_NODE_GAP;
  const margin = options.margin ?? DEFAULT_VIEWBOX_MARGIN;
  const groupRatio =
    options.groupRatio ?? DESKTOP_NODE_RADII.rGroup / DESKTOP_NODE_RADII.rMain;
  const maxRMain = options.maxRMain ?? 140;
  const clearanceMode = options.clearanceMode ?? 'glow';
  const boundsMode = options.boundsMode ?? 'core';

  let lo = 0;
  let hi = maxRMain;

  while (hi - lo > 0.25) {
    const mid = (lo + hi) / 2;
    const candidate = { rMain: mid, rGroup: mid * groupRatio };
    if (nodeLayoutIsValid(candidate, minGap, margin, clearanceMode, boundsMode)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const rMain = Math.floor(lo);
  return {
    rMain,
    rGroup: Math.floor(rMain * groupRatio),
  };
}
