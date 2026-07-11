import type { LayoutTier } from '../layout/breakpoints';

export interface ViewportFixture {
  name: string;
  width: number;
  height: number;
  tier: LayoutTier;
}

/** Common laptop viewports for diagram scaling analysis. */
export const DESKTOP_VIEWPORT_FIXTURES: ViewportFixture[] = [
  { name: 'laptop-1280x800', width: 1280, height: 800, tier: 'desktop' },
  { name: 'laptop-1366x768', width: 1366, height: 768, tier: 'desktop' },
  { name: 'laptop-1440x900', width: 1440, height: 900, tier: 'desktop' },
  { name: 'laptop-1920x1080', width: 1920, height: 1080, tier: 'desktop' },
];

/** Common tablet viewports (coarse pointer, side-by-side grid). */
export const TABLET_VIEWPORT_FIXTURES: ViewportFixture[] = [
  { name: 'tablet-1024x768', width: 1024, height: 768, tier: 'tablet' },
  { name: 'tablet-1180x820', width: 1180, height: 820, tier: 'tablet' },
  { name: 'tablet-1194x834', width: 1194, height: 834, tier: 'tablet' },
];

/**
 * Common phone portrait viewports.
 * Heights are CSS pixel dimensions (100dvh) without browser chrome.
 */
export const PHONE_VIEWPORT_FIXTURES: ViewportFixture[] = [
  { name: 'iphone-se', width: 375, height: 667, tier: 'phone' },
  { name: 'iphone-13-mini', width: 375, height: 812, tier: 'phone' },
  { name: 'iphone-14', width: 390, height: 844, tier: 'phone' },
  { name: 'iphone-14-pro-max', width: 430, height: 932, tier: 'phone' },
  { name: 'pixel-7', width: 412, height: 915, tier: 'phone' },
  { name: 'galaxy-s21', width: 360, height: 800, tier: 'phone' },
  { name: 'android-small', width: 320, height: 568, tier: 'phone' },
  { name: 'android-tall', width: 360, height: 780, tier: 'phone' },
];

export const VIEWPORT_FIXTURES: ViewportFixture[] = [
  ...DESKTOP_VIEWPORT_FIXTURES,
  ...TABLET_VIEWPORT_FIXTURES,
  ...PHONE_VIEWPORT_FIXTURES,
];
