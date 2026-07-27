import { describe, expect, it } from 'vitest';
import {
  HARMONIC_FUNCTION_LABEL_SPECS,
  LABEL_MAX_SCREEN_PX_COMPACT,
  LABEL_MIN_SCREEN_PX_COMPACT,
  LABEL_TARGET_SCREEN_PX_COMPACT,
  computeHarmonicFunctionLabelLayout,
  computeSharedHarmonicFunctionLabelFontSize,
  freeEdgeGapPx,
  outerGroupSpanPx,
  viewBoxFontFromScreenPx,
} from './harmonicFunctionLabelLayout';
import {
  COMPACT_NODE_RADII,
  DESKTOP_NODE_RADII,
  groupEffectiveRadius,
} from './diagramNodeGeometry';
import { DIAGRAM_VIEW_H, DIAGRAM_VIEW_W } from './diagramLayout';

const EARTH = { x: 0.08 * DIAGRAM_VIEW_W, y: 0.24 * DIAGRAM_VIEW_H };
const WIND = { x: 0.92 * DIAGRAM_VIEW_W, y: 0.24 * DIAGRAM_VIEW_H };
const FIRE = { x: 0.5 * DIAGRAM_VIEW_W, y: 0.88 * DIAGRAM_VIEW_H };

/** Typical phone: ~390 CSS px wide against the 1160 viewBox. */
const PHONE_SX = 390 / DIAGRAM_VIEW_W;

const ALL_EDGES = HARMONIC_FUNCTION_LABEL_SPECS.map((spec) => ({
  from:
    spec.fromParent === 'Earth'
      ? EARTH
      : spec.fromParent === 'Wind'
        ? WIND
        : FIRE,
  to:
    spec.toParent === 'Earth'
      ? EARTH
      : spec.toParent === 'Wind'
        ? WIND
        : FIRE,
  macroDAlong: spec.macroDAlong,
  labelText: spec.text,
}));

describe('harmonicFunctionLabelLayout', () => {
  it('defines Tonic, Dominant, and Subdominant with resolved gradient colors', () => {
    expect(HARMONIC_FUNCTION_LABEL_SPECS.map((s) => s.id)).toEqual([
      'tonic',
      'dominant',
      'subdominant',
    ]);
    expect(HARMONIC_FUNCTION_LABEL_SPECS[0].gradientFrom).toMatch(/^hsl\(/);
    expect(HARMONIC_FUNCTION_LABEL_SPECS[0].gradientTo).toMatch(/^hsl\(/);
  });

  it('computes Earth-Wind outer span near 2 * macroDAlong * viewW', () => {
    const span = outerGroupSpanPx(EARTH, WIND, 0.22);
    expect(span).toBeCloseTo(2 * 0.22 * DIAGRAM_VIEW_W, 5);
  });

  it('sizes free gap from core radius, not glow', () => {
    const r = COMPACT_NODE_RADII.rGroup;
    const gap = freeEdgeGapPx(EARTH, FIRE, 0.2, r);
    const span = outerGroupSpanPx(EARTH, FIRE, 0.2);
    expect(gap).toBeCloseTo(span - 2 * r, 5);
    expect(gap).toBeGreaterThan(span - 2 * groupEffectiveRadius(r));
  });

  it('converts screen pixels to viewBox font size via scale', () => {
    expect(viewBoxFontFromScreenPx(17, PHONE_SX)).toBeCloseTo(17 / PHONE_SX, 5);
  });

  it('targets readable compact screen size on a phone-scale diagram', () => {
    const fontSize = computeSharedHarmonicFunctionLabelFontSize(
      ALL_EDGES,
      COMPACT_NODE_RADII.rGroup,
      { isCompact: true, screenScaleX: PHONE_SX },
    );

    const screenPx = fontSize * PHONE_SX;
    expect(screenPx).toBeGreaterThanOrEqual(LABEL_MIN_SCREEN_PX_COMPACT - 0.1);
    expect(screenPx).toBeLessThanOrEqual(LABEL_MAX_SCREEN_PX_COMPACT + 0.1);
    expect(screenPx).toBeGreaterThanOrEqual(LABEL_TARGET_SCREEN_PX_COMPACT - 1);
  });

  it('shares one font size for all three labels', () => {
    const fontSize = computeSharedHarmonicFunctionLabelFontSize(
      ALL_EDGES,
      DESKTOP_NODE_RADII.rGroup,
      { isCompact: false, screenScaleX: 0.7 },
    );
    expect(fontSize).toBeGreaterThan(0);
  });

  it('places Tonic at Earth-Wind midpoint with near-zero rotation', () => {
    const layout = computeHarmonicFunctionLabelLayout(EARTH, WIND);
    expect(layout.x).toBeCloseTo((EARTH.x + WIND.x) / 2, 5);
    expect(layout.y).toBeCloseTo((EARTH.y + WIND.y) / 2, 5);
    expect(layout.rotationDeg).toBeCloseTo(0, 5);
  });

  it('rotates Dominant along Fire to Wind reading direction', () => {
    const layout = computeHarmonicFunctionLabelLayout(FIRE, WIND);
    const expectedDeg =
      (Math.atan2(WIND.y - FIRE.y, WIND.x - FIRE.x) * 180) / Math.PI;
    expect(layout.rotationDeg).toBeCloseTo(expectedDeg, 5);
  });
});
