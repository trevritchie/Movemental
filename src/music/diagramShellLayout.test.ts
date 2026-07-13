import { describe, it, expect } from 'vitest';
import { DIAGRAM_SCALE_POLICY } from './diagramScalePolicy';
import {
  computePhoneDiagramContainerSize,
  computeGridDiagramContainerSize,
} from './diagramShellLayout';

describe('diagramShellLayout', () => {
  it('models phone diagram height as viewport minus voice panel', () => {
    const size = computePhoneDiagramContainerSize(390, 844);
    expect(size.width).toBe(390);
    expect(size.height).toBe(
      844 - DIAGRAM_SCALE_POLICY.mobileShell.voicePanelHeight,
    );
  });

  it('models desktop grid diagram column', () => {
    const size = computeGridDiagramContainerSize(1440, 900, 'desktop');
    expect(size.width).toBeCloseTo(994.29, 0);
    expect(size.height).toBe(884);
  });

  it('never returns negative phone diagram height', () => {
    const size = computePhoneDiagramContainerSize(320, 400);
    expect(size.height).toBeGreaterThanOrEqual(0);
  });
});
