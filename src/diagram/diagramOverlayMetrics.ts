import { clamp } from '../utils/clamp';
import { computeOverlayCornerSpans, computePhoneLayoutScale } from './diagramScaling';
import type { DiagramContainerSize } from './diagramLayoutTypes';

/** Chord readout title is scaled 20% above voicing overlay values. */
const CHORD_TITLE_SIZE_SCALE = 1.2;

export type DiagramOverlayCssVars = {
  '--overlay-inset': string;
  '--overlay-inset-x': string;
  '--overlay-inset-y': string;
  '--overlay-value-size': string;
  '--overlay-label-size': string;
  '--overlay-title-size': string;
  '--overlay-subtitle-size': string;
  '--overlay-corner-max-w': string;
  '--overlay-clock-size': string;
  '--overlay-readout-max-w': string;
  '--overlay-pill-padding-y': string;
  '--overlay-pill-padding-x': string;
};

/** Default overlay metrics before the container is measured. */
export const DEFAULT_OVERLAY_METRICS: DiagramOverlayCssVars = {
  '--overlay-inset': '4px',
  '--overlay-inset-x': '2px',
  '--overlay-inset-y': '4px',
  '--overlay-value-size': '15px',
  '--overlay-label-size': '10.5px',
  '--overlay-title-size': '18px',
  '--overlay-subtitle-size': '12.5px',
  '--overlay-corner-max-w': '140px',
  '--overlay-clock-size': '120px',
  '--overlay-readout-max-w': '180px',
  '--overlay-pill-padding-y': '6px',
  '--overlay-pill-padding-x': '10px',
};

/**
 * Map diagram container dimensions to overlay sizing CSS variables.
 * Bottom overlays may overlap the diagram vertically; sizing keeps each
 * corner within half the width minus a center gutter for Fire and nodes.
 */
export function computeDiagramOverlayMetrics(
  input: DiagramContainerSize,
): DiagramOverlayCssVars {
  const { width, height } = input;
  if (width <= 0 || height <= 0) {
    return { ...DEFAULT_OVERLAY_METRICS };
  }

  const shortSide = Math.min(width, height);
  const insetX = clamp(Math.round(shortSide * 0.006), 2, 4);
  const insetY = clamp(Math.round(shortSide * 0.012), 4, 8);

  const layoutScale = computePhoneLayoutScale(width, height);

  const valueSize = clamp(shortSide * 0.034 * layoutScale, 12, 17);
  const labelSize = clamp(valueSize * 0.72, 9, 12);
  const titleSize = clamp(
    valueSize * CHORD_TITLE_SIZE_SCALE,
    14,
    17 * CHORD_TITLE_SIZE_SCALE,
  );
  const subtitleSize = clamp(valueSize * 0.82, 10.5, 14.5);

  const { maxHalfSpan } = computeOverlayCornerSpans(width, insetX);

  const clockSize = Math.round(
    clamp(width * 0.34, 72, Math.min(132, maxHalfSpan)),
  );

  const cornerMaxW = Math.max(
    72,
    Math.round(Math.min(width * 0.44, maxHalfSpan)),
  );

  const pillPadY = clamp(Math.round(4 + layoutScale * 2), 4, 6);
  const pillPadX = clamp(Math.round(7 + layoutScale * 3), 7, 10);

  return {
    '--overlay-inset': `${insetY}px`,
    '--overlay-inset-x': `${insetX}px`,
    '--overlay-inset-y': `${insetY}px`,
    '--overlay-value-size': `${valueSize.toFixed(1)}px`,
    '--overlay-label-size': `${labelSize.toFixed(1)}px`,
    '--overlay-title-size': `${titleSize.toFixed(1)}px`,
    '--overlay-subtitle-size': `${subtitleSize.toFixed(1)}px`,
    '--overlay-corner-max-w': `${cornerMaxW}px`,
    '--overlay-clock-size': `${clockSize}px`,
    '--overlay-readout-max-w': `${maxHalfSpan}px`,
    '--overlay-pill-padding-y': `${pillPadY}px`,
    '--overlay-pill-padding-x': `${pillPadX}px`,
  };
}

/** Apply overlay CSS variables to a diagram container element. */
export function applyDiagramOverlayMetrics(
  element: HTMLElement,
  metrics: DiagramOverlayCssVars,
): void {
  for (const [key, value] of Object.entries(metrics)) {
    if (element.style.getPropertyValue(key) !== value) {
      element.style.setProperty(key, value);
    }
  }
}
