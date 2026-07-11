import type { LayoutTier } from '../layout/breakpoints';
import { DIAGRAM_SCALE_POLICY } from './diagramScalePolicy';
import type { DiagramContainerSize } from './diagramScaling';

const APP_MAX_WIDTH = 1650;
const APP_HORIZONTAL_PADDING = 32;
const APP_BOTTOM_PADDING = 16;
const GRID_GAP_DESKTOP = 16;
const GRID_GAP_TABLET = 12;
const DIAGRAM_GRID_FRACTION = 2.5 / 3.5;

/**
 * Models phone portrait shell: diagram flexes (flex:1), voice panel is auto height.
 * Keep in sync with `.mobile-voice-sliders` min-height and phone panel padding in index.css.
 */
export function computePhoneDiagramContainerSize(
  viewportWidth: number,
  viewportHeight: number,
): DiagramContainerSize {
  const voicePanelHeight = DIAGRAM_SCALE_POLICY.mobileShell.voicePanelHeight;
  return {
    width: viewportWidth,
    height: Math.max(0, viewportHeight - voicePanelHeight),
  };
}

/** Models desktop/tablet grid: diagram column is 2.5fr of main content row. */
export function computeGridDiagramContainerSize(
  viewportWidth: number,
  viewportHeight: number,
  tier: 'desktop' | 'tablet',
): DiagramContainerSize {
  const appWidth = Math.min(viewportWidth, APP_MAX_WIDTH);
  const horizontalPadding = tier === 'tablet' ? 24 : APP_HORIZONTAL_PADDING;
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

/** Resolve diagram container size from viewport and layout tier. */
export function computeDiagramContainerSizeForTier(
  viewportWidth: number,
  viewportHeight: number,
  tier: LayoutTier,
): DiagramContainerSize {
  if (tier === 'phone') {
    return computePhoneDiagramContainerSize(viewportWidth, viewportHeight);
  }
  return computeGridDiagramContainerSize(viewportWidth, viewportHeight, tier);
}
