import type { LayoutTier } from '../layout/breakpoints';

/**
 * Quantitative bounds for diagram scaling, derived from viewport fixture analysis.
 * Tune these when layout CSS or viewBox dimensions change.
 */
export const DIAGRAM_SCALE_POLICY = {
  /** Stretch ratio sy/sx under preserveAspectRatio=none (after fill). */
  stretchRatio: {
    desktop: { min: 0.75, max: 1.35 },
    tablet: { min: 0.75, max: 1.35 },
    phone: { min: 1.5, max: 2.8 },
  },
  /** Minimum primary-node screen radius (px) after stretch + Y correction. */
  primaryScreenRadiusPx: {
    desktop: 47,
    tablet: 36,
    phone: 20,
  },
  /** Minimum group-node screen radius (px). */
  groupScreenRadiusPx: {
    desktop: 48,
    tablet: 34,
    phone: 18,
  },
  mobileShell: {
    /** `.mobile-voice-sliders` min-height 132px + `.borrowing-controls--phone` padding 8px. */
    voicePanelHeight: 140,
    referenceShortSide: 360,
    referenceHeight: 480,
    layoutScaleMin: 0.78,
    layoutScaleMax: 1,
  },
} as const;

export function stretchRatioLimitsForTier(
  tier: LayoutTier,
): { min: number; max: number } {
  return DIAGRAM_SCALE_POLICY.stretchRatio[tier];
}
