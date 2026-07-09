import { describe, it, expect } from 'vitest';
import {
  extractEnvelopeFromVoiceOptions,
  getPresetClickHoldEnvelope,
  getPresetFxDefaults,
  getSynthPreset,
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

describe('getPresetClickHoldEnvelope', () => {
  it('uses Warm Pad custom envelopes', () => {
    const warmPad = getPresetClickHoldEnvelope(getSynthPreset('warmPad'));
    expect(warmPad.attack).toBe(0.15);
    expect(warmPad.release).toBe(2.5);
  });

  it('uses Electric Cello JSON envelope', () => {
    const cello = getPresetClickHoldEnvelope(getSynthPreset('electricCello'));
    expect(cello.attack).toBe(0.2);
    expect(cello.decay).toBe(0.3);
    expect(cello.sustain).toBe(0.1);
    expect(cello.release).toBe(1.2);
  });

  it('uses Super Saw attackCurve from JSON', () => {
    const superSaw = getPresetClickHoldEnvelope(getSynthPreset('superSaw'));
    expect(superSaw.attackCurve).toBe('exponential');
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
});
