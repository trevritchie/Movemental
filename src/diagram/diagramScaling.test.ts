import { describe, it, expect } from 'vitest';
import {
  DESKTOP_VIEWPORT_FIXTURES,
  TABLET_VIEWPORT_FIXTURES,
} from './diagramScaleFixtures';
import {
  resolveDiagramLayoutForViewport,
  computeSvgScaleAnalysis,
  computeAspectRatioCorrection,
  getDiagramViewBox,
  isCompactDiagramMode,
  layoutMeetsScalePolicy,
  nodesRenderCircular,
  resolvePreserveAspectRatio,
  resolveShowChordNameLabels,
  resolveDefaultHarmonicFunctionLabelsEnabled,
} from './diagramScaling';
import { computeGridDiagramContainerSize } from './diagramShellLayout';
import { stretchRatioLimitsForTier } from './diagramScalePolicy';

describe('computeGridDiagramContainerSize', () => {
  it('models desktop diagram column from grid fractions', () => {
    const size = computeGridDiagramContainerSize(1440, 900, 'desktop');
    expect(size.width).toBeCloseTo(994.29, 0);
    expect(size.height).toBe(884);
  });
});

describe('desktop scaling analysis', () => {
  const meet = 'xMidYMid meet' as const;
  const stretch = resolvePreserveAspectRatio();

  it('documents letterboxing with meet on common laptops', () => {
    let letterboxedCount = 0;
    for (const fixture of DESKTOP_VIEWPORT_FIXTURES) {
      const container = computeGridDiagramContainerSize(
        fixture.width,
        fixture.height,
        fixture.tier,
      );
      const viewBox = getDiagramViewBox(false);
      const meetAnalysis = computeSvgScaleAnalysis(container, viewBox, meet);

      if (meetAnalysis.unusedHeight > 80) {
        letterboxedCount += 1;
        expect(meetAnalysis.fillRatioY).toBeLessThan(0.9);
      }
    }
    expect(letterboxedCount).toBeGreaterThanOrEqual(3);
  });

  it('fills container with stretch mode on desktop fixtures', () => {
    for (const fixture of DESKTOP_VIEWPORT_FIXTURES) {
      const container = computeGridDiagramContainerSize(
        fixture.width,
        fixture.height,
        fixture.tier,
      );
      const viewBox = getDiagramViewBox(false);
      const analysis = computeSvgScaleAnalysis(container, viewBox, stretch);

      expect(analysis.unusedWidth).toBe(0);
      expect(analysis.unusedHeight).toBe(0);
      expect(analysis.fillRatioX).toBe(1);
      expect(analysis.fillRatioY).toBe(1);
    }
  });

  it('keeps stretch ratio within reasonable bounds on desktop', () => {
    const limits = stretchRatioLimitsForTier('desktop');
    for (const fixture of DESKTOP_VIEWPORT_FIXTURES) {
      const container = computeGridDiagramContainerSize(
        fixture.width,
        fixture.height,
        fixture.tier,
      );
      const viewBox = getDiagramViewBox(false);
      const analysis = computeSvgScaleAnalysis(container, viewBox, stretch);

      expect(analysis.stretchRatio).toBeGreaterThanOrEqual(limits.min);
      expect(analysis.stretchRatio).toBeLessThanOrEqual(limits.max);
    }
  });
});

describe('tablet scaling analysis', () => {
  const stretch = resolvePreserveAspectRatio();

  it('fills container in compact stretch mode', () => {
    for (const fixture of TABLET_VIEWPORT_FIXTURES) {
      const container = computeGridDiagramContainerSize(
        fixture.width,
        fixture.height,
        fixture.tier,
      );
      const compact = isCompactDiagramMode(fixture.tier, container.width);
      const viewBox = getDiagramViewBox(compact);
      const analysis = computeSvgScaleAnalysis(container, viewBox, stretch);

      expect(analysis.unusedWidth).toBe(0);
      expect(analysis.unusedHeight).toBe(0);
    }
  });
});

describe('aspectRatioCorrection', () => {
  it('uses active viewBox AR for desktop stretch', () => {
    const container = computeGridDiagramContainerSize(1440, 900, 'desktop');
    const viewBox = getDiagramViewBox(false);
    const correction = computeAspectRatioCorrection(
      container,
      viewBox,
      'none',
    );

    const expected =
      container.width /
      container.height /
      (viewBox.width / viewBox.height);
    expect(correction).toBeCloseTo(expected, 5);
  });

  it('returns 1 for meet mode', () => {
    const container = computeGridDiagramContainerSize(1440, 900, 'desktop');
    const viewBox = getDiagramViewBox(false);
    expect(
      computeAspectRatioCorrection(container, viewBox, 'xMidYMid meet'),
    ).toBe(1);
  });

  it('restores circular nodes under non-uniform stretch', () => {
    const container = computeGridDiagramContainerSize(1440, 900, 'desktop');
    const viewBox = getDiagramViewBox(false);
    const analysis = computeSvgScaleAnalysis(container, viewBox, 'none');
    const correction = computeAspectRatioCorrection(container, viewBox, 'none');

    expect(nodesRenderCircular(analysis, correction)).toBe(true);
  });
});

describe('desktop layout resolution', () => {
  it('meets desktop scale policy on all fixtures', () => {
    for (const fixture of DESKTOP_VIEWPORT_FIXTURES) {
      const layout = resolveDiagramLayoutForViewport(
        fixture.width,
        fixture.height,
        fixture.tier,
      );
      expect(layoutMeetsScalePolicy(layout)).toBe(true);
    }
  });
});

describe('resolveShowChordNameLabels', () => {
  it('matches non-compact diagram (desktop side-by-side)', () => {
    expect(resolveShowChordNameLabels('phone', 390)).toBe(false);
    expect(resolveShowChordNameLabels('tablet', 800)).toBe(false);
    expect(resolveShowChordNameLabels('desktop', 500)).toBe(false);
    expect(resolveShowChordNameLabels('desktop', 900)).toBe(true);
  });
});

describe('resolveDefaultHarmonicFunctionLabelsEnabled', () => {
  it('uses modeled diagram width, not raw viewport width', () => {
    // Viewport above compact breakpoint, but desktop diagram column is under it.
    expect(
      resolveDefaultHarmonicFunctionLabelsEnabled('desktop', 800, 900),
    ).toBe(false);
    expect(
      resolveDefaultHarmonicFunctionLabelsEnabled('desktop', 1400, 900),
    ).toBe(true);
    expect(
      resolveDefaultHarmonicFunctionLabelsEnabled('phone', 390, 844),
    ).toBe(false);
  });
});
