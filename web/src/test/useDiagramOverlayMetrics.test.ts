import { describe, it, expect } from 'vitest';
import { clamp } from '../utils/clamp';
import {
  computeDiagramOverlayMetrics,
  DEFAULT_OVERLAY_METRICS,
} from '../hooks/useDiagramOverlayMetrics';

describe('computeDiagramOverlayMetrics', () => {
  it('returns defaults when dimensions are zero', () => {
    expect(computeDiagramOverlayMetrics({ width: 0, height: 320 })).toEqual(
      DEFAULT_OVERLAY_METRICS,
    );
    expect(computeDiagramOverlayMetrics({ width: 320, height: 0 })).toEqual(
      DEFAULT_OVERLAY_METRICS,
    );
  });

  it('scales value and title font sizes with container short side', () => {
    const small = computeDiagramOverlayMetrics({ width: 360, height: 520 });
    const large = computeDiagramOverlayMetrics({ width: 550, height: 820 });

    expect(parseFloat(small['--overlay-value-size'])).toBeLessThan(
      parseFloat(large['--overlay-value-size']),
    );
    expect(parseFloat(small['--overlay-title-size'])).toBeLessThan(
      parseFloat(large['--overlay-title-size']),
    );
  });

  it('uses a tighter horizontal inset than vertical inset on phone sizes', () => {
    const metrics = computeDiagramOverlayMetrics({ width: 320, height: 480 });
    const insetX = parseInt(metrics['--overlay-inset-x'], 10);
    const insetY = parseInt(metrics['--overlay-inset-y'], 10);

    expect(insetX).toBeGreaterThanOrEqual(2);
    expect(insetX).toBeLessThanOrEqual(4);
    expect(insetY).toBeGreaterThanOrEqual(4);
    expect(insetY).toBeLessThanOrEqual(8);
    expect(insetX).toBeLessThan(insetY);
    expect(metrics['--overlay-inset']).toBe(metrics['--overlay-inset-y']);
  });

  it('keeps chord title size aligned with voicing value size', () => {
    const metrics = computeDiagramOverlayMetrics({ width: 360, height: 520 });
    expect(metrics['--overlay-title-size']).toBe(
      metrics['--overlay-value-size'],
    );
  });

  it('sizes clock from width with a center gutter for Fire', () => {
    const metrics = computeDiagramOverlayMetrics({ width: 320, height: 379 });
    const clock = parseInt(metrics['--overlay-clock-size'], 10);

    expect(clock).toBeGreaterThanOrEqual(72);
    expect(clock).toBeLessThanOrEqual(132);
    expect(clock).toBeGreaterThan(90);
  });

  it('keeps readout and clock within horizontal corner spans', () => {
    const metrics = computeDiagramOverlayMetrics({ width: 320, height: 379 });
    const clock = parseInt(metrics['--overlay-clock-size'], 10);
    const readoutMax = parseInt(metrics['--overlay-readout-max-w'], 10);
    const insetX = parseInt(metrics['--overlay-inset-x'], 10);
    const centerGutter = clamp(Math.round(320 * 0.14), 36, 56);
    // Matches computeDiagramOverlayMetrics center gutter at width 320 (14%).
    const maxHalf = (320 - centerGutter) / 2 - insetX - 4;

    expect(readoutMax).toBeLessThanOrEqual(Math.ceil(maxHalf) + 1);
    expect(clock).toBeLessThanOrEqual(Math.ceil(maxHalf) + 1);
    expect(readoutMax + clock + centerGutter).toBeLessThanOrEqual(320 + 8);
  });

  it('sets corner max width from diagram width for top pills', () => {
    const metrics = computeDiagramOverlayMetrics({ width: 320, height: 480 });
    const cornerMax = parseInt(metrics['--overlay-corner-max-w'], 10);

    expect(cornerMax).toBeGreaterThanOrEqual(72);
    expect(cornerMax).toBeLessThanOrEqual(160);
  });
});
