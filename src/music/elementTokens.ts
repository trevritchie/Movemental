/**
 * Parent-element CSS tokens and mod-3 bucket classification for Earth / Wind /
 * Fire chemistry readouts. Chord-group HSL palettes live in diagramMetadata.
 */

export const ELEMENT_CSS_COLORS = {
  earth: 'var(--color-earth)',
  wind: 'var(--color-wind)',
  fire: 'var(--color-fire)',
} as const;

export const ELEMENT_GLOW_COLORS = {
  earth: 'var(--glow-earth)',
  wind: 'var(--glow-wind)',
  fire: 'var(--glow-fire)',
} as const;

export const PARENT_ELEMENT_NAMES = ['Earth', 'Wind', 'Fire'] as const;
export type ParentElementName = (typeof PARENT_ELEMENT_NAMES)[number];

const PARENT_ELEMENT_STYLES: Record<
  ParentElementName,
  { color: string; glow: string }
> = {
  Earth: { color: ELEMENT_CSS_COLORS.earth, glow: ELEMENT_GLOW_COLORS.earth },
  Wind: { color: ELEMENT_CSS_COLORS.wind, glow: ELEMENT_GLOW_COLORS.wind },
  Fire: { color: ELEMENT_CSS_COLORS.fire, glow: ELEMENT_GLOW_COLORS.fire },
};

export const DEFAULT_PARENT_ELEMENT_STYLE = {
  color: 'var(--color-mixed)',
  glow: 'rgba(255,255,255,0.15)',
};

/** Mod-3 bucket for a pitch class relative to tonal center (0=earth, 1=wind, 2=fire). */
export function elementBucketForRelativePc(relPc: number): 0 | 1 | 2 {
  const rem = ((relPc % 3) + 3) % 3;
  return rem as 0 | 1 | 2;
}

/** CSS color var for a relative pitch class bucket. */
export function cssColorForRelativePc(relPc: number): string {
  const bucket = elementBucketForRelativePc(relPc);
  if (bucket === 0) return ELEMENT_CSS_COLORS.earth;
  if (bucket === 1) return ELEMENT_CSS_COLORS.wind;
  return ELEMENT_CSS_COLORS.fire;
}

export function parentElementStyle(name: string): { color: string; glow: string } {
  if (name === 'Earth' || name === 'Wind' || name === 'Fire') {
    return PARENT_ELEMENT_STYLES[name];
  }
  return DEFAULT_PARENT_ELEMENT_STYLE;
}

export function parentElementColor(name: string): string {
  return parentElementStyle(name).color;
}
