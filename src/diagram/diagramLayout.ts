/**
 * Elemental diagram viewBox dimensions and normalized-to-pixel coordinate helpers.
 */

export const DIAGRAM_VIEW_W = 1160;
export const DIAGRAM_VIEW_H = 800;
export const DIAGRAM_COMPACT_VIEW_W = 1210;
export const DIAGRAM_COMPACT_VIEW_H = 860;
export const DIAGRAM_COMPACT_VIEW_PAD = 25;

export function coordToPixels(
  x: number,
  y: number,
  viewW: number = DIAGRAM_VIEW_W,
  viewH: number = DIAGRAM_VIEW_H
): { x: number; y: number } {
  return { x: x * viewW, y: y * viewH };
}
