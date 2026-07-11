import type { LayoutTier } from '../layout/breakpoints';

export interface ViewportFixture {
  name: string;
  width: number;
  height: number;
  tier: LayoutTier;
}

/** Common laptop and tablet viewports for diagram scaling analysis. */
export const VIEWPORT_FIXTURES: ViewportFixture[] = [
  { name: 'laptop-1280x800', width: 1280, height: 800, tier: 'desktop' },
  { name: 'laptop-1366x768', width: 1366, height: 768, tier: 'desktop' },
  { name: 'laptop-1440x900', width: 1440, height: 900, tier: 'desktop' },
  { name: 'laptop-1920x1080', width: 1920, height: 1080, tier: 'desktop' },
  { name: 'tablet-1024x768', width: 1024, height: 768, tier: 'tablet' },
  { name: 'tablet-1180x820', width: 1180, height: 820, tier: 'tablet' },
  { name: 'tablet-1194x834', width: 1194, height: 834, tier: 'tablet' },
];
