import { BREAKPOINTS, type LayoutTier } from '../layout/breakpoints';
import {
  DIAGRAM_VIEW_W,
  DIAGRAM_VIEW_H,
  DIAGRAM_COMPACT_VIEW_W,
  DIAGRAM_COMPACT_VIEW_H,
  DIAGRAM_COMPACT_VIEW_PAD,
} from './diagramLayout';
import {
  COMPACT_NODE_RADII,
  DESKTOP_NODE_RADII,
  type DiagramNodeRadii,
} from './diagramNodeGeometry';
import { computeDiagramContainerSizeForTier } from './diagramShellLayout';
import {
  DIAGRAM_SCALE_POLICY,
  stretchRatioLimitsForTier,
} from './diagramScalePolicy';
import { clamp } from '../utils/clamp';
import type {
  DiagramContainerSize,
  DiagramLayoutResolution,
  DiagramPreserveAspectRatio,
  DiagramScreenMetrics,
  DiagramViewBox,
  SvgScaleAnalysis,
} from './diagramLayoutTypes';

export type {
  DiagramContainerSize,
  DiagramLayoutResolution,
  DiagramPreserveAspectRatio,
  DiagramScreenMetrics,
  DiagramViewBox,
  SvgScaleAnalysis,
} from './diagramLayoutTypes';

export function isCompactDiagramMode(
  tier: LayoutTier,
  containerWidth: number,
  compactDiagramWidth: number = BREAKPOINTS.compactDiagramWidth,
): boolean {
  return (
    tier === 'phone' ||
    tier === 'tablet' ||
    containerWidth < compactDiagramWidth
  );
}

/**
 * Whether the elemental diagram shows per-chord name labels.
 * Matches ElementalDiagram `showLabels = !isCompactDiagram`.
 */
export function resolveShowChordNameLabels(
  layoutTier: LayoutTier,
  containerWidth: number,
  compactDiagramWidth: number = BREAKPOINTS.compactDiagramWidth,
): boolean {
  return !isCompactDiagramMode(
    layoutTier,
    containerWidth,
    compactDiagramWidth,
  );
}

/**
 * Whether harmonic-function labels should default on for a viewport.
 * Uses the modeled diagram column width, not raw viewport width, so the
 * result matches ElementalDiagram compact decisions.
 */
export function resolveDefaultHarmonicFunctionLabelsEnabled(
  layoutTier: LayoutTier,
  viewportWidth: number,
  viewportHeight: number,
  compactDiagramWidth: number = BREAKPOINTS.compactDiagramWidth,
): boolean {
  const container = computeDiagramContainerSizeForTier(
    viewportWidth,
    viewportHeight,
    layoutTier,
  );
  return resolveShowChordNameLabels(
    layoutTier,
    container.width,
    compactDiagramWidth,
  );
}

export function getDiagramViewBox(isCompactDiagram: boolean): DiagramViewBox {
  if (isCompactDiagram) {
    return {
      x: -DIAGRAM_COMPACT_VIEW_PAD,
      y: -DIAGRAM_COMPACT_VIEW_PAD,
      width: DIAGRAM_COMPACT_VIEW_W,
      height: DIAGRAM_COMPACT_VIEW_H,
    };
  }
  return {
    x: 0,
    y: 0,
    width: DIAGRAM_VIEW_W,
    height: DIAGRAM_VIEW_H,
  };
}

export function viewBoxToString(viewBox: DiagramViewBox): string {
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
}

export function viewBoxAspectRatio(viewBox: DiagramViewBox): number {
  return viewBox.width / viewBox.height;
}

/** Stretch-to-fill on all tiers; nodes stay round via aspectRatioCorrection. */
export function resolvePreserveAspectRatio(): DiagramPreserveAspectRatio {
  return 'none';
}

export function resolveNodeRadii(isCompactDiagram: boolean): DiagramNodeRadii {
  return isCompactDiagram ? COMPACT_NODE_RADII : DESKTOP_NODE_RADII;
}

export function computeAspectRatioCorrection(
  container: DiagramContainerSize,
  viewBox: DiagramViewBox,
  preserveAspectRatio: DiagramPreserveAspectRatio,
): number {
  if (preserveAspectRatio !== 'none') return 1;
  if (container.width <= 0 || container.height <= 0) return 1;
  const containerAR = container.width / container.height;
  const viewBoxAR = viewBoxAspectRatio(viewBox);
  return containerAR / viewBoxAR;
}

export function computeSvgScaleAnalysis(
  container: DiagramContainerSize,
  viewBox: DiagramViewBox,
  preserveAspectRatio: DiagramPreserveAspectRatio,
): SvgScaleAnalysis {
  const { width: cw, height: ch } = container;
  const { width: vw, height: vh } = viewBox;

  if (cw <= 0 || ch <= 0 || vw <= 0 || vh <= 0) {
    return {
      sx: 0,
      sy: 0,
      contentWidth: 0,
      contentHeight: 0,
      unusedWidth: cw,
      unusedHeight: ch,
      fillRatioX: 0,
      fillRatioY: 0,
      stretchRatio: 1,
    };
  }

  if (preserveAspectRatio === 'none') {
    const sx = cw / vw;
    const sy = ch / vh;
    return {
      sx,
      sy,
      contentWidth: cw,
      contentHeight: ch,
      unusedWidth: 0,
      unusedHeight: 0,
      fillRatioX: 1,
      fillRatioY: 1,
      stretchRatio: sy / sx,
    };
  }

  const sxMeet = cw / vw;
  const syMeet = ch / vh;
  const scale = preserveAspectRatio === 'xMidYMid slice'
    ? Math.max(sxMeet, syMeet)
    : Math.min(sxMeet, syMeet);

  const contentWidth = vw * scale;
  const contentHeight = vh * scale;

  return {
    sx: scale,
    sy: scale,
    contentWidth,
    contentHeight,
    unusedWidth: Math.max(0, cw - contentWidth),
    unusedHeight: Math.max(0, ch - contentHeight),
    fillRatioX: contentWidth / cw,
    fillRatioY: contentHeight / ch,
    stretchRatio: 1,
  };
}

/**
 * Shared phone UI scale factor for overlay pills, clock, and readouts.
 * Keep in sync with DIAGRAM_SCALE_POLICY.mobileShell.
 */
export function computePhoneLayoutScale(
  containerWidth: number,
  containerHeight: number,
): number {
  const { referenceShortSide, referenceHeight, layoutScaleMin, layoutScaleMax } =
    DIAGRAM_SCALE_POLICY.mobileShell;
  if (containerWidth <= 0 || containerHeight <= 0) {
    return layoutScaleMin;
  }
  return clamp(
    Math.min(containerHeight / referenceHeight, containerWidth / referenceShortSide),
    layoutScaleMin,
    layoutScaleMax,
  );
}

/** Center gutter and max half-width for phone corner overlays (clock, readout, pills). */
export function computeOverlayCornerSpans(
  containerWidth: number,
  insetX: number,
): { centerGutter: number; maxHalfSpan: number } {
  const centerGutter = clamp(Math.round(containerWidth * 0.14), 36, 56);
  const maxHalfSpan = Math.max(
    72,
    Math.floor((containerWidth - centerGutter) / 2 - insetX - 4),
  );
  return { centerGutter, maxHalfSpan };
}

/** Screen-space node radius after stretch + Y correction (uniform sx). */
export function computeNodeScreenRadius(
  viewBoxRadius: number,
  scaleAnalysis: SvgScaleAnalysis,
): number {
  return viewBoxRadius * scaleAnalysis.sx;
}

export function computeDiagramScreenMetrics(
  nodeRadii: DiagramNodeRadii,
  scaleAnalysis: SvgScaleAnalysis,
  container: DiagramContainerSize,
  layoutTier: LayoutTier,
): DiagramScreenMetrics {
  return {
    primaryNodeScreenRadius: computeNodeScreenRadius(
      nodeRadii.rMain,
      scaleAnalysis,
    ),
    groupNodeScreenRadius: computeNodeScreenRadius(
      nodeRadii.rGroup,
      scaleAnalysis,
    ),
    stretchRatio: scaleAnalysis.stretchRatio,
    layoutScale: layoutTier === 'phone'
      ? computePhoneLayoutScale(container.width, container.height)
      : 1,
  };
}

/** Whether circular nodes render uniformly under stretch + Y correction. */
export function nodesRenderCircular(
  scaleAnalysis: SvgScaleAnalysis,
  aspectRatioCorrection: number,
): boolean {
  if (scaleAnalysis.sx <= 0 || scaleAnalysis.sy <= 0) return true;
  const renderedYOverX = (scaleAnalysis.sy * aspectRatioCorrection) / scaleAnalysis.sx;
  return Math.abs(renderedYOverX - 1) < 1e-5;
}

/** Validates a resolved layout against DIAGRAM_SCALE_POLICY bounds. */
export function layoutMeetsScalePolicy(layout: DiagramLayoutResolution): boolean {
  const limits = stretchRatioLimitsForTier(layout.layoutTier);
  const policy = DIAGRAM_SCALE_POLICY;
  const { scaleAnalysis, screenMetrics } = layout;

  if (scaleAnalysis.unusedWidth !== 0 || scaleAnalysis.unusedHeight !== 0) {
    return false;
  }
  if (
    screenMetrics.stretchRatio < limits.min ||
    screenMetrics.stretchRatio > limits.max
  ) {
    return false;
  }
  if (
    screenMetrics.primaryNodeScreenRadius <
    policy.primaryScreenRadiusPx[layout.layoutTier]
  ) {
    return false;
  }
  if (
    screenMetrics.groupNodeScreenRadius <
    policy.groupScreenRadiusPx[layout.layoutTier]
  ) {
    return false;
  }
  if (!nodesRenderCircular(scaleAnalysis, layout.aspectRatioCorrection)) {
    return false;
  }
  return true;
}

/** Skip React updates when a remeasure yields identical layout values. */
export function diagramLayoutsEqual(
  a: DiagramLayoutResolution,
  b: DiagramLayoutResolution,
): boolean {
  return (
    a.viewBoxString === b.viewBoxString &&
    a.aspectRatioCorrection === b.aspectRatioCorrection &&
    a.isCompactDiagram === b.isCompactDiagram &&
    a.nodeRadii.rMain === b.nodeRadii.rMain &&
    a.nodeRadii.rGroup === b.nodeRadii.rGroup &&
    a.scaleAnalysis.stretchRatio === b.scaleAnalysis.stretchRatio
  );
}

/**
 * Single entry point for diagram SVG layout: viewBox, stretch, correction, radii.
 * Call on every container measure (ResizeObserver) with live dimensions.
 */
export function resolveDiagramLayout(input: {
  containerWidth: number;
  containerHeight: number;
  layoutTier: LayoutTier;
  compactDiagramWidth?: number;
}): DiagramLayoutResolution {
  const container = {
    width: input.containerWidth,
    height: input.containerHeight,
  };
  const isCompactDiagram = isCompactDiagramMode(
    input.layoutTier,
    input.containerWidth,
    input.compactDiagramWidth,
  );
  const viewBox = getDiagramViewBox(isCompactDiagram);
  const preserveAspectRatio = resolvePreserveAspectRatio();
  const aspectRatioCorrection = computeAspectRatioCorrection(
    container,
    viewBox,
    preserveAspectRatio,
  );
  const nodeRadii = resolveNodeRadii(isCompactDiagram);
  const scaleAnalysis = computeSvgScaleAnalysis(
    container,
    viewBox,
    preserveAspectRatio,
  );
  const screenMetrics = computeDiagramScreenMetrics(
    nodeRadii,
    scaleAnalysis,
    container,
    input.layoutTier,
  );

  return {
    layoutTier: input.layoutTier,
    isCompactDiagram,
    viewBox,
    viewBoxString: viewBoxToString(viewBox),
    preserveAspectRatio,
    aspectRatioCorrection,
    nodeRadii,
    scaleAnalysis,
    screenMetrics,
  };
}

/** Pre-measure defaults derived from layout tier (before ResizeObserver fires). */
export function createInitialDiagramLayout(
  layoutTier: LayoutTier,
  compactDiagramWidth = BREAKPOINTS.compactDiagramWidth,
): DiagramLayoutResolution {
  return resolveDiagramLayout({
    containerWidth: 0,
    containerHeight: 0,
    layoutTier,
    compactDiagramWidth,
  });
}

/** Resolve layout from viewport dimensions (for fixture analysis tests). */
export function resolveDiagramLayoutForViewport(
  viewportWidth: number,
  viewportHeight: number,
  tier: LayoutTier,
  compactDiagramWidth = BREAKPOINTS.compactDiagramWidth,
): DiagramLayoutResolution {
  const container = computeDiagramContainerSizeForTier(
    viewportWidth,
    viewportHeight,
    tier,
  );
  return resolveDiagramLayout({
    containerWidth: container.width,
    containerHeight: container.height,
    layoutTier: tier,
    compactDiagramWidth,
  });
}
