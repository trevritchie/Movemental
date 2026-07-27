/**
 * Geometry and sizing for Tonic / Dominant / Subdominant harmonic-function
 * labels on the elemental triangle edges.
 *
 * Sizing model (screen-first):
 * 1. Target a readable cap-height in CSS pixels (phone ~17px, desktop ~15px).
 * 2. Convert to viewBox font size via the SVG's horizontal screen scale.
 * 3. Cap width with the outer-group centroid span (Trunk↔Leaf style), using
 *    solid cores only for mental clearance; glow is ignored. If cores alone
 *    cannot host Subdominant at the target, keep the screen size and allow
 *    soft overlap with cores rather than shrinking below readability.
 * 4. One shared font size for all three labels so proportions stay consistent.
 */
import {
  DIAGRAM_VIEW_H,
  DIAGRAM_VIEW_W,
} from './diagramLayout';

export type HarmonicFunctionLabelId =
  | 'tonic'
  | 'dominant'
  | 'subdominant';

export type ParentElementName = 'Earth' | 'Wind' | 'Fire';

/**
 * Concrete SVG stop colors. CSS variables often fail inside SVG <stop>
 * on WebKit, so gradients use resolved HSL (slightly lifted for dark UI).
 */
export const HARMONIC_FUNCTION_LABEL_COLORS = {
  earth: 'hsl(28, 58%, 52%)',
  wind: 'hsl(197, 70%, 62%)',
  fire: 'hsl(5, 82%, 58%)',
} as const;

export interface HarmonicFunctionLabelSpec {
  id: HarmonicFunctionLabelId;
  text: string;
  /** Reading-direction start parent. */
  fromParent: ParentElementName;
  /** Reading-direction end parent. */
  toParent: ParentElementName;
  gradientFrom: string;
  gradientTo: string;
  /** ChordManager macroDAlong for this edge (normalized units). */
  macroDAlong: number;
}

export const HARMONIC_FUNCTION_LABEL_SPECS: readonly HarmonicFunctionLabelSpec[] =
  [
    {
      id: 'tonic',
      text: 'Tonic',
      fromParent: 'Earth',
      toParent: 'Wind',
      gradientFrom: HARMONIC_FUNCTION_LABEL_COLORS.earth,
      gradientTo: HARMONIC_FUNCTION_LABEL_COLORS.wind,
      macroDAlong: 0.22,
    },
    {
      id: 'dominant',
      text: 'Dominant',
      fromParent: 'Fire',
      toParent: 'Wind',
      gradientFrom: HARMONIC_FUNCTION_LABEL_COLORS.fire,
      gradientTo: HARMONIC_FUNCTION_LABEL_COLORS.wind,
      macroDAlong: 0.2,
    },
    {
      id: 'subdominant',
      text: 'Subdominant',
      fromParent: 'Earth',
      toParent: 'Fire',
      gradientFrom: HARMONIC_FUNCTION_LABEL_COLORS.earth,
      gradientTo: HARMONIC_FUNCTION_LABEL_COLORS.fire,
      macroDAlong: 0.2,
    },
  ] as const;

export interface HarmonicFunctionLabelLayout {
  x: number;
  y: number;
  rotationDeg: number;
}

/** Target rendered cap height (CSS px) after SVG scale. */
export const LABEL_TARGET_SCREEN_PX_COMPACT = 17;
export const LABEL_TARGET_SCREEN_PX_DESKTOP = 15;
export const LABEL_MIN_SCREEN_PX_COMPACT = 14;
export const LABEL_MIN_SCREEN_PX_DESKTOP = 12;
export const LABEL_MAX_SCREEN_PX_COMPACT = 20;
export const LABEL_MAX_SCREEN_PX_DESKTOP = 18;

/** Approximate bold sans advance width as a fraction of font size. */
const CHAR_WIDTH_FACTOR = 0.52;

/**
 * Fraction of outer-group centroid span used as the text-width budget.
 * Ignores glow; may soft-overlap solid cores for long words.
 */
const SPAN_WIDTH_FRACTION = 0.82;

/**
 * Pixel distance between the two outer along-axis group centroids
 * (e.g. Trunk and Leaf on Earth-Wind).
 */
export function outerGroupSpanPx(
  from: { x: number; y: number },
  to: { x: number; y: number },
  macroDAlong: number,
  viewW: number = DIAGRAM_VIEW_W,
  viewH: number = DIAGRAM_VIEW_H,
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const edgeLenPx = Math.hypot(dx, dy);
  if (edgeLenPx <= 0) return 0;

  const dxNorm = dx / viewW;
  const dyNorm = dy / viewH;
  const edgeLenNorm = Math.hypot(dxNorm, dyNorm);
  if (edgeLenNorm <= 0) return 0;

  return 2 * macroDAlong * (edgeLenPx / edgeLenNorm);
}

/**
 * Free along-axis gap between outer group *core* edges at the midpoint.
 */
export function freeEdgeGapPx(
  from: { x: number; y: number },
  to: { x: number; y: number },
  macroDAlong: number,
  groupRadius: number,
  viewW: number = DIAGRAM_VIEW_W,
  viewH: number = DIAGRAM_VIEW_H,
): number {
  const span = outerGroupSpanPx(from, to, macroDAlong, viewW, viewH);
  return Math.max(0, span - 2 * groupRadius);
}

export function rawFontSizeForHarmonicFunctionLabel(
  widthBudget: number,
  labelText: string,
): number {
  const len = Math.max(1, labelText.length);
  return widthBudget / (len * CHAR_WIDTH_FACTOR);
}

export function viewBoxFontFromScreenPx(
  screenPx: number,
  screenScaleX: number,
): number {
  const sx = Math.max(screenScaleX, 0.01);
  return screenPx / sx;
}

export interface SharedLabelFontSizeInput {
  from: { x: number; y: number };
  to: { x: number; y: number };
  macroDAlong: number;
  labelText: string;
}

/**
 * Shared viewBox font size: readable on screen first, then limited by the
 * tightest edge width budget (outer-group span).
 */
export function computeSharedHarmonicFunctionLabelFontSize(
  edges: readonly SharedLabelFontSizeInput[],
  groupRadius: number,
  options: {
    isCompact?: boolean;
    /** SVG horizontal scale (containerWidth / viewBoxWidth). */
    screenScaleX: number;
    viewW?: number;
    viewH?: number;
  },
): number {
  const viewW = options.viewW ?? DIAGRAM_VIEW_W;
  const viewH = options.viewH ?? DIAGRAM_VIEW_H;
  const isCompact = options.isCompact === true;
  const sx = Math.max(options.screenScaleX, 0.01);

  const targetCss = isCompact
    ? LABEL_TARGET_SCREEN_PX_COMPACT
    : LABEL_TARGET_SCREEN_PX_DESKTOP;
  const minCss = isCompact
    ? LABEL_MIN_SCREEN_PX_COMPACT
    : LABEL_MIN_SCREEN_PX_DESKTOP;
  const maxCss = isCompact
    ? LABEL_MAX_SCREEN_PX_COMPACT
    : LABEL_MAX_SCREEN_PX_DESKTOP;

  const fromScreen = viewBoxFontFromScreenPx(targetCss, sx);
  const floor = viewBoxFontFromScreenPx(minCss, sx);
  const ceiling = viewBoxFontFromScreenPx(maxCss, sx);

  if (edges.length === 0) {
    return Math.min(ceiling, Math.max(floor, fromScreen));
  }

  let fromSpan = Infinity;
  let fromCore = Infinity;
  for (const edge of edges) {
    const span = outerGroupSpanPx(
      edge.from,
      edge.to,
      edge.macroDAlong,
      viewW,
      viewH,
    );
    const coreGap = freeEdgeGapPx(
      edge.from,
      edge.to,
      edge.macroDAlong,
      groupRadius,
      viewW,
      viewH,
    );
    fromSpan = Math.min(
      fromSpan,
      rawFontSizeForHarmonicFunctionLabel(
        span * SPAN_WIDTH_FRACTION,
        edge.labelText,
      ),
    );
    fromCore = Math.min(
      fromCore,
      rawFontSizeForHarmonicFunctionLabel(coreGap, edge.labelText),
    );
  }

  // Prefer the screen target. Use core clearance when it still fits; otherwise
  // fall back to the wider centroid-span budget so Subdominant stays readable.
  const size =
    fromCore >= fromScreen
      ? fromScreen
      : Math.min(fromScreen, Math.max(fromCore, fromSpan));

  return Math.min(ceiling, Math.max(floor, size));
}

/**
 * Midpoint placement and reading-direction rotation for one edge label.
 */
export function computeHarmonicFunctionLabelLayout(
  from: { x: number; y: number },
  to: { x: number; y: number },
): HarmonicFunctionLabelLayout {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const edgeLen = Math.hypot(dx, dy);
  const x = (from.x + to.x) / 2;
  const y = (from.y + to.y) / 2;
  const rotationDeg =
    edgeLen > 0 ? (Math.atan2(dy, dx) * 180) / Math.PI : 0;

  return {
    x,
    y,
    rotationDeg,
  };
}
