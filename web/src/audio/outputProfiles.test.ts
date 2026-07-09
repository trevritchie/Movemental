import { describe, it, expect, vi } from 'vitest';
import {
  getAdaptedOutputProfile,
  normalizeEqProfileId,
  resolveDefaultEqProfileId,
} from './outputProfiles';
import { readEqProfileId } from './audioSettingsStorage';

function mockLayoutTier(
  innerWidth: number,
  options: { coarse?: boolean; portrait?: boolean } = {},
) {
  const coarse = options.coarse ?? false;
  const portrait = options.portrait ?? true;

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: innerWidth,
  });

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    let matches = false;
    if (query === '(pointer: coarse)') {
      matches = coarse;
    } else if (query === '(orientation: portrait)') {
      matches = portrait;
    }
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });
}

describe('normalizeEqProfileId', () => {
  it('migrates legacy studio id to flat', () => {
    expect(normalizeEqProfileId('studio')).toBe('flat');
  });

  it('accepts current eq profile ids', () => {
    expect(normalizeEqProfileId('largeSpeakers')).toBe('largeSpeakers');
    expect(normalizeEqProfileId('smallSpeakers')).toBe('smallSpeakers');
    expect(normalizeEqProfileId('flat')).toBe('flat');
  });
});

describe('resolveDefaultEqProfileId', () => {
  it('returns smallSpeakers on desktop', () => {
    expect(resolveDefaultEqProfileId('desktop')).toBe('smallSpeakers');
  });

  it('returns smallSpeakers on phone', () => {
    expect(resolveDefaultEqProfileId('phone')).toBe('smallSpeakers');
  });

  it('returns smallSpeakers on tablet', () => {
    expect(resolveDefaultEqProfileId('tablet')).toBe('smallSpeakers');
  });
});

describe('getAdaptedOutputProfile', () => {
  it('returns flat profile unchanged on all tiers', () => {
    const flat = getAdaptedOutputProfile('flat', 'phone');
    expect(flat.loudness.masterMakeupDb).toBe(2);
    expect(flat.harmonicEnhance.enabled).toBe(false);
  });

  it('returns largeSpeakers profile unchanged on all tiers', () => {
    const large = getAdaptedOutputProfile('largeSpeakers', 'phone');
    expect(large.loudness.masterMakeupDb).toBe(4);
    expect(large.eq.low).toBe(2);
    expect(large.harmonicEnhance.enabled).toBe(false);
  });

  it('applies desktop-safe small speakers overrides', () => {
    const profile = getAdaptedOutputProfile('smallSpeakers', 'desktop');
    expect(profile.loudness.masterMakeupDb).toBe(2);
    expect(profile.loudness.synthVolumeDb).toBe(-7);
    expect(profile.eq.mid).toBe(2);
    expect(profile.harmonicEnhance.wet).toBe(0.08);
    expect(profile.harmonicEnhance.distortion).toBe(0.08);
    expect(profile.loudness.fxScale).toBe(0.85);
    expect(profile.loudness.compressor.threshold).toBe(-22);
  });

  it('applies louder mobile small speakers overrides', () => {
    const profile = getAdaptedOutputProfile('smallSpeakers', 'phone');
    expect(profile.loudness.masterMakeupDb).toBe(6);
    expect(profile.loudness.synthVolumeDb).toBe(-4);
    expect(profile.eq.mid).toBe(3);
    expect(profile.harmonicEnhance.wet).toBe(0.2);
    expect(profile.loudness.fxScale).toBe(0.8);
    expect(profile.loudness.compressor.threshold).toBe(-26);
  });

  it('applies the same mobile overrides on tablet', () => {
    const profile = getAdaptedOutputProfile('smallSpeakers', 'tablet');
    expect(profile.loudness.masterMakeupDb).toBe(6);
  });
});

describe('readEqProfileId', () => {
  it('returns tier-based default without localStorage', () => {
    mockLayoutTier(1400);
    expect(readEqProfileId('desktop')).toBe('smallSpeakers');
    expect(readEqProfileId('phone')).toBe('smallSpeakers');
  });
});
