import { describe, it, expect } from 'vitest';
import {
  COMPACT_NODE_RADII,
  DESKTOP_NODE_RADII,
  DEFAULT_MIN_NODE_GAP,
  computeMinNodeClearance,
  findMaxNodeRadii,
  fitsViewBox,
  nodeLayoutIsValid,
  primaryEffectiveRadius,
  groupEffectiveRadius,
} from './diagramNodeGeometry';

const DESKTOP_BASELINE = { rMain: 52, rGroup: 54 };
const COMPACT_BASELINE = { rMain: 100, rGroup: 102 };

describe('diagram node geometry', () => {
  it('increases desktop node size from baseline without glow overlap', () => {
    expect(DESKTOP_NODE_RADII.rMain).toBeGreaterThan(DESKTOP_BASELINE.rMain);
    expect(DESKTOP_NODE_RADII.rGroup).toBeGreaterThan(DESKTOP_BASELINE.rGroup);

    const baseline = computeMinNodeClearance(DESKTOP_BASELINE, 'glow');
    const upgraded = computeMinNodeClearance(DESKTOP_NODE_RADII, 'glow');
    expect(upgraded.minClearance).toBeGreaterThanOrEqual(DEFAULT_MIN_NODE_GAP);
    expect(baseline.minClearance).toBeGreaterThan(upgraded.minClearance);
  });

  it('validates chosen desktop radii with glow-aware clearance', () => {
    expect(
      nodeLayoutIsValid(
        DESKTOP_NODE_RADII,
        DEFAULT_MIN_NODE_GAP,
        6,
        'glow',
        'core',
      ),
    ).toBe(true);
    const clearance = computeMinNodeClearance(DESKTOP_NODE_RADII, 'glow');
    expect(clearance.minClearance).toBeGreaterThanOrEqual(DEFAULT_MIN_NODE_GAP);
    expect(clearance.worstPair).toBe('Trunk↔Charcoal');
  });

  it('validates compact radii with core-circle clearance', () => {
    expect(
      nodeLayoutIsValid(
        COMPACT_NODE_RADII,
        DEFAULT_MIN_NODE_GAP,
        6,
        'core',
        'core',
      ),
    ).toBe(true);
    const clearance = computeMinNodeClearance(COMPACT_NODE_RADII, 'core');
    expect(clearance.minClearance).toBeGreaterThanOrEqual(DEFAULT_MIN_NODE_GAP);
  });

  it('documents compact baseline core overlap', () => {
    const baselineCore = computeMinNodeClearance(COMPACT_BASELINE, 'core');
    expect(baselineCore.minClearance).toBeLessThan(0);
  });

  it('findMaxNodeRadii matches configured desktop radii (glow mode)', () => {
    const maxDesktop = findMaxNodeRadii({
      groupRatio: DESKTOP_NODE_RADII.rGroup / DESKTOP_NODE_RADII.rMain,
      clearanceMode: 'glow',
      boundsMode: 'core',
    });
    expect(DESKTOP_NODE_RADII.rMain).toBe(maxDesktop.rMain);
    expect(DESKTOP_NODE_RADII.rGroup).toBe(maxDesktop.rGroup);
  });

  it('findMaxNodeRadii matches configured compact radii (core mode)', () => {
    const maxCompact = findMaxNodeRadii({
      groupRatio: COMPACT_NODE_RADII.rGroup / COMPACT_NODE_RADII.rMain,
      clearanceMode: 'core',
      boundsMode: 'core',
    });
    expect(COMPACT_NODE_RADII.rMain).toBe(maxCompact.rMain);
    expect(COMPACT_NODE_RADII.rGroup).toBe(maxCompact.rGroup);
  });

  it('rejects radii that overlap glow circles on desktop', () => {
    const tooLarge = {
      rMain: DESKTOP_NODE_RADII.rMain + 4,
      rGroup: DESKTOP_NODE_RADII.rGroup + 4,
    };
    expect(nodeLayoutIsValid(tooLarge, DEFAULT_MIN_NODE_GAP, 6, 'glow', 'core')).toBe(
      false,
    );
  });

  it('keeps node cores inside the viewBox', () => {
    expect(fitsViewBox(DESKTOP_NODE_RADII, 6, 'core')).toBe(true);
    expect(fitsViewBox(COMPACT_NODE_RADII, 6, 'core')).toBe(true);
  });

  it('uses glow radii larger than core node radii', () => {
    expect(primaryEffectiveRadius(DESKTOP_NODE_RADII.rMain)).toBeGreaterThan(
      DESKTOP_NODE_RADII.rMain,
    );
    expect(groupEffectiveRadius(DESKTOP_NODE_RADII.rGroup)).toBeGreaterThan(
      DESKTOP_NODE_RADII.rGroup,
    );
  });
});
