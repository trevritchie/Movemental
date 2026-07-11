/**
 * Phone diagram overlay CSS variables (re-exported from pure layout module).
 */
export {
  computeDiagramOverlayMetrics,
  DEFAULT_OVERLAY_METRICS,
  type DiagramOverlayCssVars,
} from '../music/diagramOverlayMetrics';

import type { DiagramOverlayCssVars } from '../music/diagramOverlayMetrics';

/** Apply overlay CSS variables to a diagram container element. */
export function applyDiagramOverlayMetrics(
  element: HTMLElement,
  metrics: DiagramOverlayCssVars,
): void {
  for (const [key, value] of Object.entries(metrics)) {
    element.style.setProperty(key, value);
  }
}
