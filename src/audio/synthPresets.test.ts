import { describe, it, expect } from 'vitest';
import {
  extractEnvelopeFromVoiceOptions,
  getPresetTapAndHoldEnvelope,
  getPresetFxDefaults,
  getSynthPreset,
  SAMPLER_ENGINE_PRESETS,
  SYNTH_ENGINE_PRESETS,
} from './synthPresets';

describe('extractEnvelopeFromVoiceOptions', () => {
  it('reads ADSR and attackCurve from vendored JSON', () => {
    const envelope = extractEnvelopeFromVoiceOptions({
      oscillator: { type: 'fatsawtooth' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.4,
        attackCurve: 'exponential',
      },
    });

    expect(envelope).toEqual({
      attack: 0.01,
      decay: 0.1,
      sustain: 0.5,
      release: 0.4,
      attackCurve: 'exponential',
    });
  });

  it('returns null when JSON has no envelope', () => {
    expect(extractEnvelopeFromVoiceOptions({ oscillator: { type: 'sine' } })).toBeNull();
  });
});

describe('getPresetTapAndHoldEnvelope', () => {
  it('uses Warm Pad custom envelopes', () => {
    const warmPad = getPresetTapAndHoldEnvelope(getSynthPreset('warmPad'));
    expect(warmPad.attack).toBe(0.15);
    expect(warmPad.release).toBe(2.5);
  });

  it('uses Electric Cello pad-style envelope defaults', () => {
    const cello = getPresetTapAndHoldEnvelope(getSynthPreset('electricCello'));
    expect(cello.attack).toBe(0.2);
    expect(cello.decay).toBe(1.5);
    expect(cello.sustain).toBe(0.45);
    expect(cello.release).toBe(2.0);
  });

  it('prefers envelopeDefaults over JSON attackCurve', () => {
    const superSaw = getPresetTapAndHoldEnvelope(getSynthPreset('superSaw'));
    expect(superSaw.attack).toBe(0.08);
    expect(superSaw.attackCurve).toBeUndefined();
  });
});

describe('getPresetFxDefaults', () => {
  it('keeps Warm Pad bus effects', () => {
    expect(getPresetFxDefaults(getSynthPreset('warmPad'))).toEqual({
      chorusWet: 0.35,
      delayWet: 0,
      reverbWet: 0.3,
    });
  });

  it('returns dry FX for vendored presets', () => {
    expect(getPresetFxDefaults(getSynthPreset('electricCello'))).toEqual({
      chorusWet: 0,
      delayWet: 0,
      reverbWet: 0,
    });
  });

  it('uses light room reverb for Warm Piano', () => {
    expect(getPresetFxDefaults(getSynthPreset('grandPiano'))).toEqual({
      chorusWet: 0,
      delayWet: 0,
      reverbWet: 0.12,
    });
  });

  it('groups presets by engine type', () => {
    expect(SYNTH_ENGINE_PRESETS.map((p) => p.id)).toEqual([
      'warmPad',
      'superSaw',
      'electricCello',
    ]);
    expect(SAMPLER_ENGINE_PRESETS[0]?.id).toBe('grandPiano');
    expect(SAMPLER_ENGINE_PRESETS.some((p) => p.id === 'violin')).toBe(true);
    expect(SAMPLER_ENGINE_PRESETS.some((p) => p.id === 'piano')).toBe(true);
    expect(SAMPLER_ENGINE_PRESETS.some((p) => p.id === 'bass-electric')).toBe(
      false,
    );
    expect(SAMPLER_ENGINE_PRESETS.some((p) => p.id === 'contrabass')).toBe(
      false,
    );
    expect(SAMPLER_ENGINE_PRESETS.length).toBeGreaterThan(18);
  });
});
