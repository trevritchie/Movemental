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
};

/**
 * Map diagram container dimensions to overlay sizing CSS variables.
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
  const valueSize = clamp(shortSide * 0.034, 14, 17);
  const labelSize = clamp(valueSize * 0.72, 10, 12);
  const titleSize = valueSize;
  const subtitleSize = clamp(valueSize * 0.82, 11.5, 14.5);
  const cornerMaxW = Math.max(
    80,
    Math.round(width / 2 - insetX * 2),
  );

  return {
    '--overlay-inset': `${insetY}px`,
    '--overlay-inset-x': `${insetX}px`,
    '--overlay-inset-y': `${insetY}px`,
    '--overlay-value-size': `${valueSize.toFixed(1)}px`,
    '--overlay-label-size': `${labelSize.toFixed(1)}px`,
    '--overlay-title-size': `${titleSize.toFixed(1)}px`,
    '--overlay-subtitle-size': `${subtitleSize.toFixed(1)}px`,
    '--overlay-corner-max-w': `${cornerMaxW}px`,
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
