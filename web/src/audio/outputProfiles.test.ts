import { describe, expect, it } from 'vitest';
import {
  LIMITER_CEILING_DB,
  OUTPUT_PROFILES,
  getAdaptedOutputProfile,
  getEffectiveSynthVolumeDb,
  getOutputProfile,
} from './outputProfiles';
import { getSynthPreset } from './synthPresets';

describe('outputProfiles gain staging', () => {
  it('uses a conservative limiter ceiling everywhere', () => {
    expect(LIMITER_CEILING_DB).toBe(-3);

    for (const id of ['smallSpeakers', 'largeSpeakers', 'flat'] as const) {
      expect(getOutputProfile(id).loudness.limiterCeilingDb).toBe(-3);
    }
  });

  it('does not give mobile a higher limiter ceiling than desktop', () => {
    const desktop = getAdaptedOutputProfile('smallSpeakers', 'desktop');
    const mobile = getAdaptedOutputProfile('smallSpeakers', 'phone');

    expect(mobile.loudness.limiterCeilingDb).toBe(
      desktop.loudness.limiterCeilingDb,
    );
    expect(mobile.loudness.limiterCeilingDb).toBeLessThanOrEqual(-3);
  });

  it('removes mobile makeup and synth loudness boosts', () => {
    const mobileSmall = getAdaptedOutputProfile('smallSpeakers', 'phone');
    const mobileLarge = getAdaptedOutputProfile('largeSpeakers', 'phone');

    expect(mobileSmall.loudness.masterMakeupDb).toBe(0);
    expect(mobileLarge.loudness.masterMakeupDb).toBe(0);
    expect(mobileSmall.loudness.synthVolumeDb).toBe(-8);
    expect(mobileLarge.loudness.synthVolumeDb).toBe(-8);
  });

  it('caps makeup gain at 1.5 dB on base profiles', () => {
    expect(OUTPUT_PROFILES.smallSpeakers.loudness.masterMakeupDb).toBeLessThanOrEqual(
      1.5,
    );
    expect(OUTPUT_PROFILES.largeSpeakers.loudness.masterMakeupDb).toBeLessThanOrEqual(
      1.5,
    );
  });

  it('uses flat reference staging for exports and calibration', () => {
    const flat = getOutputProfile('flat');

    expect(flat.loudness.synthVolumeDb).toBe(-12);
    expect(flat.loudness.masterMakeupDb).toBe(0);
    expect(flat.harmonicEnhance.enabled).toBe(false);
  });

  it('uses gentler bus compression ratios', () => {
    const mobile = getAdaptedOutputProfile('smallSpeakers', 'phone');

    expect(mobile.loudness.compressor.ratio).toBeLessThanOrEqual(2.5);
    expect(mobile.loudness.compressor.release).toBeGreaterThanOrEqual(0.12);
  });

  it('keeps phone loudness compensation in EQ and harmonic enhance', () => {
    const mobile = getAdaptedOutputProfile('smallSpeakers', 'phone');

    expect(mobile.eq.mid).toBeGreaterThan(0);
    expect(mobile.harmonicEnhance.enabled).toBe(true);
    expect(mobile.harmonicEnhance.wet).toBeGreaterThan(0);
  });

  it('applies profile synth offsets relative to the smallSpeakers reference', () => {
    const preset = getSynthPreset('warmPad');
    const flat = getOutputProfile('flat');
    const mobile = getAdaptedOutputProfile('smallSpeakers', 'phone');

    const flatDb = getEffectiveSynthVolumeDb(preset, flat);
    const mobileDb = getEffectiveSynthVolumeDb(preset, mobile);

    expect(flatDb).toBeLessThan(mobileDb);
    expect(mobileDb - flatDb).toBe(4);
  });
});
