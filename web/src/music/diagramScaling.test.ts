import { describe, it, expect } from 'vitest';
import { VIEWPORT_FIXTURES } from './diagramScaleFixtures';
import {
  computeDiagramContainerSize,
  computeSvgScaleAnalysis,
  computeAspectRatioCorrection,
  getDiagramViewBox,
  isCompactDiagramMode,
  resolvePreserveAspectRatio,
} from './diagramScaling';

describe('computeDiagramContainerSize', () => {
  it('models desktop diagram column from grid fractions', () => {
    const size = computeDiagramContainerSize(1440, 900, 'desktop');
    expect(size.width).toBeCloseTo(994.29, 0);
    expect(size.height).toBe(884);
  });
});

describe('desktop scaling analysis', () => {
  const meet = 'xMidYMid meet' as const;
  const stretch = resolvePreserveAspectRatio();

  it('documents letterboxing with meet on common laptops', () => {
    let letterboxedCount = 0;
    for (const fixture of VIEWPORT_FIXTURES.filter((f) => f.tier === 'desktop')) {
      const container = computeDiagramContainerSize(
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
    for (const fixture of VIEWPORT_FIXTURES.filter((f) => f.tier === 'desktop')) {
      const container = computeDiagramContainerSize(
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
    for (const fixture of VIEWPORT_FIXTURES.filter((f) => f.tier === 'desktop')) {
      const container = computeDiagramContainerSize(
        fixture.width,
        fixture.height,
        fixture.tier,
      );
      const viewBox = getDiagramViewBox(false);
      const analysis = computeSvgScaleAnalysis(container, viewBox, stretch);

      expect(analysis.stretchRatio).toBeGreaterThan(0.75);
      expect(analysis.stretchRatio).toBeLessThan(1.35);
    }
  });
});

describe('tablet scaling analysis', () => {
  const stretch = resolvePreserveAspectRatio();

  it('fills container in compact stretch mode', () => {
    for (const fixture of VIEWPORT_FIXTURES.filter((f) => f.tier === 'tablet')) {
      const container = computeDiagramContainerSize(
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
    const container = computeDiagramContainerSize(1440, 900, 'desktop');
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
    const container = computeDiagramContainerSize(1440, 900, 'desktop');
    const viewBox = getDiagramViewBox(false);
    expect(
      computeAspectRatioCorrection(container, viewBox, 'xMidYMid meet'),
    ).toBe(1);
  });

  it('restores circular nodes under non-uniform stretch', () => {
    const container = computeDiagramContainerSize(1440, 900, 'desktop');
    const viewBox = getDiagramViewBox(false);
    const analysis = computeSvgScaleAnalysis(container, viewBox, 'none');
    const correction = computeAspectRatioCorrection(container, viewBox, 'none');

    const renderedRadiusYOverX = (analysis.sy * correction) / analysis.sx;
    expect(renderedRadiusYOverX).toBeCloseTo(1, 5);
  });
});
