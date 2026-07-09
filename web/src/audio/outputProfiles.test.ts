import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAdaptedOutputProfile,
  resolveDefaultOutputProfileId,
} from './outputProfiles';
import { readOutputProfileId, OUTPUT_PROFILE_STORAGE_KEY } from './audioSettingsStorage';

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

describe('resolveDefaultOutputProfileId', () => {
  it('returns studio on desktop', () => {
    expect(resolveDefaultOutputProfileId('desktop')).toBe('studio');
  });

  it('returns smallSpeakers on phone', () => {
    expect(resolveDefaultOutputProfileId('phone')).toBe('smallSpeakers');
  });

  it('returns smallSpeakers on tablet', () => {
    expect(resolveDefaultOutputProfileId('tablet')).toBe('smallSpeakers');
  });
});

describe('getAdaptedOutputProfile', () => {
  it('returns studio profile unchanged on all tiers', () => {
    const studio = getAdaptedOutputProfile('studio', 'phone');
    expect(studio.loudness.masterMakeupDb).toBe(2);
    expect(studio.harmonicEnhance.enabled).toBe(false);
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

describe('readOutputProfileId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns tier-based default when localStorage is empty', () => {
    mockLayoutTier(1400);
    expect(readOutputProfileId('desktop')).toBe('studio');
    expect(readOutputProfileId('phone')).toBe('smallSpeakers');
  });

  it('returns stored profile when user has an explicit choice', () => {
    localStorage.setItem(OUTPUT_PROFILE_STORAGE_KEY, 'smallSpeakers');
    expect(readOutputProfileId('desktop')).toBe('smallSpeakers');
  });
});
