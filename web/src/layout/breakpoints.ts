/**
 * Layout tier resolution and media-query strings for responsive UI.
 * BREAKPOINTS and PHONE_*_MEDIA must stay in sync with layout/breakpoints.css
 * and matching rules in index.css.
 */

export type LayoutTier = 'phone' | 'tablet' | 'desktop';

/** Must stay in sync with layout/breakpoints.css custom properties. */
export const BREAKPOINTS = {
  phoneMax: 767,
  compactMax: 950,
  tabletMax: 1199,
  desktopMin: 1200,
  phoneLandscapeMaxHeight: 500,
  compactDiagramWidth: 600,
} as const;

/** CSS media query for stacked phone layout (keep in sync with index.css). */
export const PHONE_LAYOUT_MEDIA =
  '(max-width: 767px), (max-width: 950px) and (orientation: portrait) and (pointer: coarse)';

/** Phone landscape rotate prompt (keep in sync with index.css). */
export const PHONE_LANDSCAPE_BLOCK_MEDIA =
  '(max-height: 500px) and (orientation: landscape) and (pointer: coarse), ' +
  '(max-width: 767px) and (orientation: landscape) and (pointer: coarse)';

export function isPhoneLandscapeBlocked(): boolean {
  return window.matchMedia(PHONE_LANDSCAPE_BLOCK_MEDIA).matches;
}

export function resolveLayoutTier(): LayoutTier {
  const w = window.innerWidth;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const portrait = window.matchMedia('(orientation: portrait)').matches;

  if (
    w <= BREAKPOINTS.phoneMax ||
    (w <= BREAKPOINTS.compactMax && portrait && coarse)
  ) {
    return 'phone';
  }
  if (w <= BREAKPOINTS.tabletMax && coarse) {
    return 'tablet';
  }
  return 'desktop';
}

/** Safe for module init / test environments without matchMedia. */
export function resolveLayoutTierSafe(): LayoutTier {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'desktop';
  }
  return resolveLayoutTier();
}
