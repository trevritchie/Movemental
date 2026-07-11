import { describe, it, expect } from 'vitest';
import { clamp } from '../utils/clamp';
import { computeDiagramOverlayMetrics } from '../hooks/useDiagramOverlayMetrics';
import { PHONE_VIEWPORT_FIXTURES } from './diagramScaleFixtures';
import {
  resolveDiagramLayoutForViewport,
  computePhoneLayoutScale,
} from './diagramScaling';
import {
  DIAGRAM_SCALE_POLICY,
  stretchRatioLimitsForTier,
} from './diagramScalePolicy';
import { computeDiagramContainerSizeForTier } from './diagramShellLayout';

describe('phone shell layout', () => {
  it('allocates diagram height from measured voice panel constant', () => {
    for (const fixture of PHONE_VIEWPORT_FIXTURES) {
      const container = computeDiagramContainerSizeForTier(
        fixture.width,
        fixture.height,
        'phone',
      );
      expect(container.width).toBe(fixture.width);
      expect(container.height).toBe(
        fixture.height - DIAGRAM_SCALE_POLICY.mobileShell.voicePanelHeight,
      );
      expect(container.height).toBeGreaterThan(300);
    }
  });
});

describe('phone diagram scaling', () => {
  it('fills the diagram container on all phone fixtures', () => {
    for (const fixture of PHONE_VIEWPORT_FIXTURES) {
      const layout = resolveDiagramLayoutForViewport(
        fixture.width,
        fixture.height,
        'phone',
      );
      expect(layout.scaleAnalysis.unusedWidth).toBe(0);
      expect(layout.scaleAnalysis.unusedHeight).toBe(0);
      expect(layout.scaleAnalysis.fillRatioX).toBe(1);
      expect(layout.scaleAnalysis.fillRatioY).toBe(1);
    }
  });

  it('keeps stretch ratio within phone policy bounds', () => {
    const limits = stretchRatioLimitsForTier('phone');
    for (const fixture of PHONE_VIEWPORT_FIXTURES) {
      const layout = resolveDiagramLayoutForViewport(
        fixture.width,
        fixture.height,
        'phone',
      );
      expect(layout.screenMetrics.stretchRatio).toBeGreaterThanOrEqual(
        limits.min,
      );
      expect(layout.screenMetrics.stretchRatio).toBeLessThanOrEqual(limits.max);
    }
  });

  it('restores circular nodes on all phone fixtures', () => {
    for (const fixture of PHONE_VIEWPORT_FIXTURES) {
      const layout = resolveDiagramLayoutForViewport(
        fixture.width,
        fixture.height,
        'phone',
      );
      const { sx, sy } = layout.scaleAnalysis;
      const renderedYOverX = (sy * layout.aspectRatioCorrection) / sx;
      expect(renderedYOverX).toBeCloseTo(1, 5);
    }
  });

  it('meets minimum primary node screen radius on all phones', () => {
    const minRadius = DIAGRAM_SCALE_POLICY.primaryScreenRadiusPx.phone;
    for (const fixture of PHONE_VIEWPORT_FIXTURES) {
      const layout = resolveDiagramLayoutForViewport(
        fixture.width,
        fixture.height,
        'phone',
      );
      expect(layout.screenMetrics.primaryNodeScreenRadius).toBeGreaterThanOrEqual(
        minRadius,
      );
    }
  });

  it('meets minimum group node screen radius on all phones', () => {
    const minRadius = DIAGRAM_SCALE_POLICY.groupScreenRadiusPx.phone;
    for (const fixture of PHONE_VIEWPORT_FIXTURES) {
      const layout = resolveDiagramLayoutForViewport(
        fixture.width,
        fixture.height,
        'phone',
      );
      expect(layout.screenMetrics.groupNodeScreenRadius).toBeGreaterThanOrEqual(
        minRadius,
      );
    }
  });

  it('uses compact viewBox and radii on phone', () => {
    const layout = resolveDiagramLayoutForViewport(390, 844, 'phone');
    expect(layout.isCompactDiagram).toBe(true);
    expect(layout.viewBox.width).toBe(1210);
    expect(layout.nodeRadii.rMain).toBe(78);
  });
});

describe('phone overlay metrics integration', () => {
  it('scales layout factor from diagram container on each phone fixture', () => {
    for (const fixture of PHONE_VIEWPORT_FIXTURES) {
      const container = computeDiagramContainerSizeForTier(
        fixture.width,
        fixture.height,
        'phone',
      );
      const expected = computePhoneLayoutScale(container.width, container.height);
      const metrics = computeDiagramOverlayMetrics(container);
      const layout = resolveDiagramLayoutForViewport(
        fixture.width,
        fixture.height,
        'phone',
      );
      expect(layout.screenMetrics.layoutScale).toBeCloseTo(expected, 5);
      const valueSize = parseFloat(metrics['--overlay-value-size']);
      expect(valueSize).toBeGreaterThanOrEqual(12);
      expect(valueSize).toBeLessThanOrEqual(17);
    }
  });

  it('keeps clock and readout within corner spans on small phones', () => {
    for (const fixture of PHONE_VIEWPORT_FIXTURES) {
      const container = computeDiagramContainerSizeForTier(
        fixture.width,
        fixture.height,
        'phone',
      );
      const metrics = computeDiagramOverlayMetrics(container);
      const clock = parseInt(metrics['--overlay-clock-size'], 10);
      const readoutMax = parseInt(metrics['--overlay-readout-max-w'], 10);
      const insetX = parseInt(metrics['--overlay-inset-x'], 10);
      const centerGutter = clamp(
        Math.round(container.width * 0.14),
        36,
        56,
      );
      const maxHalf = (container.width - centerGutter) / 2 - insetX - 4;

      expect(readoutMax).toBeLessThanOrEqual(Math.ceil(maxHalf) + 1);
      expect(clock).toBeLessThanOrEqual(Math.ceil(maxHalf) + 1);
    }
  });

  it('uses tighter horizontal than vertical overlay inset on phones', () => {
    const metrics = computeDiagramOverlayMetrics({ width: 320, height: 428 });
    const insetX = parseInt(metrics['--overlay-inset-x'], 10);
    const insetY = parseInt(metrics['--overlay-inset-y'], 10);
    expect(insetX).toBeLessThan(insetY);
  });
});

describe('resolveDiagramLayout', () => {
  it('returns consistent viewBox string and preserveAspectRatio', () => {
    const phone = resolveDiagramLayoutForViewport(390, 844, 'phone');
    const desktop = resolveDiagramLayoutForViewport(1440, 900, 'desktop');

    expect(phone.viewBoxString).toBe('-25 -25 1210 860');
    expect(phone.preserveAspectRatio).toBe('none');
    expect(desktop.viewBoxString).toBe('0 0 1160 800');
    expect(desktop.nodeRadii.rMain).toBe(62);
  });
});
