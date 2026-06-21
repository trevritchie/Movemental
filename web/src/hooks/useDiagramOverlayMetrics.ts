/**
 * Compute CSS custom properties for phone diagram corner overlays from the
 * measured diagram container size.
 */

export interface DiagramOverlayMetricsInput {
  width: number;
  height: number;
}

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

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Default overlay metrics before the container is measured. */
export const DEFAULT_OVERLAY_METRICS: DiagramOverlayCssVars = {
  '--overlay-inset': '4px',
  '--overlay-inset-x': '2px',
  '--overlay-inset-y': '4px',
  '--overlay-value-size': '15px',
  '--overlay-label-size': '10.5px',
  '--overlay-title-size': '15px',
  '--overlay-subtitle-size': '12.5px',
  '--overlay-corner-max-w': '140px',
  '--overlay-clock-size': '120px',
  '--overlay-readout-max-w': '180px',
  '--overlay-pill-padding-y': '6px',
  '--overlay-pill-padding-x': '10px',
};

/**
 * Map diagram container dimensions to overlay sizing CSS variables.
 *
 * Bottom overlays may overlap the diagram vertically; sizing keeps each
 * corner within half the width minus a center gutter for Fire and nodes.
 */
export function computeDiagramOverlayMetrics(
  input: DiagramOverlayMetricsInput,
): DiagramOverlayCssVars {
  const { width, height } = input;
  if (width <= 0 || height <= 0) {
    return { ...DEFAULT_OVERLAY_METRICS };
  }

  const shortSide = Math.min(width, height);
  const insetX = clamp(Math.round(shortSide * 0.006), 2, 4);
  const insetY = clamp(Math.round(shortSide * 0.012), 4, 8);

  const layoutScale = clamp(
    Math.min(height / 480, width / 360),
    0.78,
    1,
  );

  const valueSize = clamp(shortSide * 0.034 * layoutScale, 12, 17);
  const labelSize = clamp(valueSize * 0.72, 9, 12);
  const titleSize = valueSize;
  const subtitleSize = clamp(valueSize * 0.82, 10.5, 14.5);

  const centerGutter = clamp(Math.round(width * 0.14), 36, 56);
  const maxCornerSpan = Math.max(
    72,
    Math.round((width - centerGutter) / 2 - insetX - 4),
  );

  const clockSize = Math.round(
    clamp(width * 0.34, 72, Math.min(132, maxCornerSpan)),
  );

  const readoutMaxW = maxCornerSpan;

  const cornerMaxW = Math.max(
    72,
    Math.round(Math.min(width * 0.44, maxCornerSpan)),
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
    '--overlay-readout-max-w': `${readoutMaxW}px`,
    '--overlay-pill-padding-y': `${pillPadY}px`,
    '--overlay-pill-padding-x': `${pillPadX}px`,
  };
}

/**
 * Apply overlay CSS variables to a diagram container element.
 */
export function applyDiagramOverlayMetrics(
  element: HTMLElement,
  metrics: DiagramOverlayCssVars,
): void {
  for (const [key, value] of Object.entries(metrics)) {
    element.style.setProperty(key, value);
  }
}
