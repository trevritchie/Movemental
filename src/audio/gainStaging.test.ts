import { describe, expect, it } from 'vitest';
import { BUS_HEADROOM_DB } from './busConstants';
import {
  LIMITER_CEILING_DB,
  dbToGain,
  getAdaptedOutputProfile,
  getEffectiveSynthVolumeDb,
} from './outputProfiles';
import { getSynthPreset } from './synthPresets';

function gainToDb(gain: number): number {
  return 20 * Math.log10(gain);
}

describe('gainStaging math', () => {
  it('converts dB to linear gain and back', () => {
    expect(dbToGain(0)).toBe(1);
    expect(gainToDb(dbToGain(-12))).toBeCloseTo(-12, 5);
    expect(gainToDb(dbToGain(6))).toBeCloseTo(6, 5);
    expect(gainToDb(dbToGain(-3))).toBeCloseTo(-3, 5);
  });

  it('documents expected peak budget for a four-voice chord', () => {
    const preset = getSynthPreset('warmPad');
    const profile = getAdaptedOutputProfile('smallSpeakers', 'phone');
    const voiceDb = getEffectiveSynthVolumeDb(preset, profile);

    // Four uncorrelated voices sum roughly +6 dB above a single voice.
    const chordPeakDb = voiceDb + 6 + BUS_HEADROOM_DB;
    const limiterCeilingDb = profile.loudness.limiterCeilingDb;

    expect(chordPeakDb).toBeLessThan(limiterCeilingDb);
    expect(limiterCeilingDb).toBe(LIMITER_CEILING_DB);
  });

  it('keeps bass preset effective level below smallSpeakers mobile synth offset', () => {
    const bass = getSynthPreset('bass-electric');
    const profile = getAdaptedOutputProfile('smallSpeakers', 'phone');
    const effectiveDb = getEffectiveSynthVolumeDb(bass, profile);

    expect(effectiveDb).toBeLessThanOrEqual(-6);
  });

  it('leaves headroom after makeup for the limiter safety margin', () => {
    const profile = getAdaptedOutputProfile('smallSpeakers', 'phone');
    const makeupDb = profile.loudness.masterMakeupDb;

    expect(makeupDb + LIMITER_CEILING_DB).toBeLessThanOrEqual(-3);
  });
});
