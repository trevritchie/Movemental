/**
 * Compute tour popover position clamped to the viewport.
 */
import type { CSSProperties } from 'react';

export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const POPOVER_EST_HEIGHT = 240;
const VIEWPORT_PAD = 16;

export function popoverStyle(target: TargetRect): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const popoverWidth = Math.min(320, vw - VIEWPORT_PAD * 2);

  let left = target.left + target.width / 2 - popoverWidth / 2;
  left = Math.max(
    VIEWPORT_PAD,
    Math.min(left, vw - popoverWidth - VIEWPORT_PAD),
  );

  const safeTop = VIEWPORT_PAD;
  const safeBottom = vh - VIEWPORT_PAD;
  const targetBottom = target.top + target.height;
  const spaceBelow = safeBottom - targetBottom;
  const spaceAbove = target.top - safeTop;
  const isLargeTarget =
    target.height > vh * 0.4 || target.width > vw * 0.55;

  if (isLargeTarget) {
    const top = Math.max(
      safeTop,
      Math.min(
        (vh - POPOVER_EST_HEIGHT) / 2,
        safeBottom - POPOVER_EST_HEIGHT,
      ),
    );
    return { top, left, width: popoverWidth };
  }

  if (spaceBelow >= POPOVER_EST_HEIGHT + 12) {
    return {
      top: targetBottom + 12,
      left,
      width: popoverWidth,
    };
  }

  if (spaceAbove >= POPOVER_EST_HEIGHT + 12) {
    return {
      top: Math.max(safeTop, target.top - POPOVER_EST_HEIGHT - 12),
      left,
      width: popoverWidth,
    };
  }

  const top = Math.max(
    safeTop,
    Math.min(
      (vh - POPOVER_EST_HEIGHT) / 2,
      safeBottom - POPOVER_EST_HEIGHT,
    ),
  );
  return { top, left, width: popoverWidth };
}
