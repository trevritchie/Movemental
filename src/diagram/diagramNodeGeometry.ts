import { chordManager } from '../music/ChordManager';
import { BASE_GROUPS, SLICE_VARIANTS } from '../music/diagramMetadata';
import {
  DIAGRAM_VIEW_W,
  DIAGRAM_VIEW_H,
  DIAGRAM_COMPACT_VIEW_W,
  DIAGRAM_COMPACT_VIEW_H,
  DIAGRAM_COMPACT_VIEW_PAD,
} from './diagramLayout';

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
 * Compact radii prioritize phone tap targets over strict core clearance.
 * Trunk↔Charcoal cores may overlap; glow halos intentionally blend.
 */
export const COMPACT_NODE_RADII: DiagramNodeRadii = {
  rMain: 102,
  rGroup: 104,
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

function nodesFitBounds(
  radii: DiagramNodeRadii,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  mode: NodeClearanceMode,
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
      node.x - node.r >= bounds.minX &&
      node.x + node.r <= bounds.maxX &&
      node.y - node.r >= bounds.minY &&
      node.y + node.r <= bounds.maxY,
  );
}

/** Desktop viewBox (0 0 1160 800). */
export function fitsViewBox(
  radii: DiagramNodeRadii,
  margin = DEFAULT_VIEWBOX_MARGIN,
  mode: NodeClearanceMode = 'core',
): boolean {
  return nodesFitBounds(
    radii,
    {
      minX: margin,
      maxX: DIAGRAM_VIEW_W - margin,
      minY: margin,
      maxY: DIAGRAM_VIEW_H - margin,
    },
    mode,
  );
}

/** Compact phone viewBox (-25 -25 1210 860); allows larger radii than desktop bounds. */
export function fitsCompactViewBox(
  radii: DiagramNodeRadii,
  margin = DEFAULT_VIEWBOX_MARGIN,
  mode: NodeClearanceMode = 'core',
): boolean {
  const origin = -DIAGRAM_COMPACT_VIEW_PAD;
  return nodesFitBounds(
    radii,
    {
      minX: origin + margin,
      maxX: origin + DIAGRAM_COMPACT_VIEW_W - margin,
      minY: origin + margin,
      maxY: origin + DIAGRAM_COMPACT_VIEW_H - margin,
    },
    mode,
  );
}

export function nodeLayoutIsValid(
  radii: DiagramNodeRadii,
  minGap = DEFAULT_MIN_NODE_GAP,
  margin = DEFAULT_VIEWBOX_MARGIN,
  clearanceMode: NodeClearanceMode = 'glow',
  boundsMode: NodeClearanceMode = 'core',
  bounds: 'desktop' | 'compact' = 'desktop',
): boolean {
  const clearance = computeMinNodeClearance(radii, clearanceMode);
  const fits =
    bounds === 'compact'
      ? fitsCompactViewBox(radii, margin, boundsMode)
      : fitsViewBox(radii, margin, boundsMode);
  return clearance.minClearance >= minGap && fits;
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
  bounds?: 'desktop' | 'compact';
}): DiagramNodeRadii {
  const minGap = options.minGap ?? DEFAULT_MIN_NODE_GAP;
  const margin = options.margin ?? DEFAULT_VIEWBOX_MARGIN;
  const groupRatio =
    options.groupRatio ?? DESKTOP_NODE_RADII.rGroup / DESKTOP_NODE_RADII.rMain;
  const maxRMain = options.maxRMain ?? 140;
  const clearanceMode = options.clearanceMode ?? 'glow';
  const boundsMode = options.boundsMode ?? 'core';
  const bounds = options.bounds ?? 'desktop';

  let lo = 0;
  let hi = maxRMain;

  while (hi - lo > 0.25) {
    const mid = (lo + hi) / 2;
    const candidate = { rMain: mid, rGroup: mid * groupRatio };
    if (
      nodeLayoutIsValid(
        candidate,
        minGap,
        margin,
        clearanceMode,
        boundsMode,
        bounds,
      )
    ) {
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

/** Max phone radii: compact viewBox fit; cores may overlap at Trunk↔Charcoal. */
export function findMaxCompactNodeRadii(
  minCoreGap = -40,
): DiagramNodeRadii {
  return findMaxNodeRadii({
    groupRatio: COMPACT_NODE_RADII.rGroup / COMPACT_NODE_RADII.rMain,
    clearanceMode: 'core',
    boundsMode: 'core',
    bounds: 'compact',
    minGap: minCoreGap,
    maxRMain: 130,
  });
}
