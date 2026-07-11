import {
  DIAGRAM_VIEW_W,
  DIAGRAM_VIEW_H,
  DIAGRAM_COMPACT_VIEW_W,
  DIAGRAM_COMPACT_VIEW_H,
  DIAGRAM_COMPACT_VIEW_PAD,
} from './diagramLayout';

export type DiagramPreserveAspectRatio = 'none' | 'xMidYMid meet' | 'xMidYMid slice';

export interface DiagramViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagramContainerSize {
  width: number;
  height: number;
}

export interface SvgScaleAnalysis {
  sx: number;
  sy: number;
  contentWidth: number;
  contentHeight: number;
  unusedWidth: number;
  unusedHeight: number;
  fillRatioX: number;
  fillRatioY: number;
  stretchRatio: number;
}

const APP_MAX_WIDTH = 1650;
const APP_HORIZONTAL_PADDING = 32;
const APP_BOTTOM_PADDING = 16;
const GRID_GAP_DESKTOP = 16;
const GRID_GAP_TABLET = 12;
const DIAGRAM_GRID_FRACTION = 2.5 / 3.5;

/** Models `.main-content` grid diagram column size from viewport dimensions. */
export function computeDiagramContainerSize(
  viewportWidth: number,
  viewportHeight: number,
  tier: 'desktop' | 'tablet' | 'phone' = 'desktop',
): DiagramContainerSize {
  if (tier === 'phone') {
    // Portrait phone: diagram column is full width; height is remaining flex space.
    // Voice panel height is layout-dependent; use ~72% of viewport as diagram estimate.
    return {
      width: viewportWidth,
      height: Math.round(viewportHeight * 0.72),
    };
  }

  const appWidth = Math.min(viewportWidth, APP_MAX_WIDTH);
  const horizontalPadding =
    tier === 'tablet' ? 24 : APP_HORIZONTAL_PADDING;
  const bottomPadding = tier === 'tablet' ? 12 : APP_BOTTOM_PADDING;
  const gridGap = tier === 'tablet' ? GRID_GAP_TABLET : GRID_GAP_DESKTOP;

  const mainWidth = appWidth - horizontalPadding;
  const mainHeight = viewportHeight - bottomPadding;
  const diagramWidth = (mainWidth - gridGap) * DIAGRAM_GRID_FRACTION;

  return {
    width: diagramWidth,
    height: mainHeight,
  };
}

export function isCompactDiagramMode(
  tier: 'desktop' | 'tablet' | 'phone',
  containerWidth: number,
  compactDiagramWidth = 600,
): boolean {
  return (
    tier === 'phone' ||
    tier === 'tablet' ||
    containerWidth < compactDiagramWidth
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

export function viewBoxAspectRatio(viewBox: DiagramViewBox): number {
  return viewBox.width / viewBox.height;
}

/** Stretch-to-fill on all tiers; nodes stay round via aspectRatioCorrection. */
export function resolvePreserveAspectRatio(): DiagramPreserveAspectRatio {
  return 'none';
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

/** After stretch + Y correction, a unit circle's screen-space radius scales by sx. */
export function computeNodeScreenScale(
  container: DiagramContainerSize,
  viewBox: DiagramViewBox,
): number {
  const analysis = computeSvgScaleAnalysis(
    container,
    viewBox,
    resolvePreserveAspectRatio(),
  );
  return analysis.sx;
}
