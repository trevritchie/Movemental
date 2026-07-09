import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Tone from 'tone';
import { audioEngine } from '../audio/AudioEngine';
import {
  dbToGain,
  getAdaptedOutputProfile,
  getOutputProfile,
} from '../audio/outputProfiles';
import { getSynthPreset } from '../audio/synthPresets';

describe('AudioEngine.playNotes', () => {
  beforeEach(async () => {
    await audioEngine.startContext();
    audioEngine.releaseActiveNotes();
  });

  it('tracks active notes so the next playNotes releases them', () => {
    const voice = (audioEngine as unknown as { voice: Tone.PolySynth }).voice;
    const releaseSpy = vi.spyOn(voice, 'triggerRelease');

    audioEngine.playNotes([60, 64, 67], '2n');
    audioEngine.playNotes([62, 65], '2n');

    expect(releaseSpy).toHaveBeenCalled();
    const firstReleaseArg = releaseSpy.mock.calls[0]?.[0];
    expect(firstReleaseArg).toEqual(expect.arrayContaining(['C4', 'E4', 'G4']));
  });
});

describe('AudioEngine EQ profiles', () => {
  beforeEach(async () => {
    await audioEngine.startContext();
    audioEngine.releaseActiveNotes();
    audioEngine.setOutputProfile(getAdaptedOutputProfile('smallSpeakers', 'desktop'));
  });

  it('switches to flat profile with harmonic enhance bypassed', () => {
    const engine = audioEngine as unknown as {
      eq: Tone.EQ3;
      harmonicWetGain: Tone.Gain;
      compressor: Tone.Compressor;
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
    };

    audioEngine.setOutputProfile(getOutputProfile('flat'));

    expect(audioEngine.getEqProfileId()).toBe('flat');
    expect(engine.eq.low.value).toBe(0);
    expect(engine.eq.mid.value).toBe(0);
    expect(engine.harmonicWetGain.gain.value).toBe(0);
    expect(engine.compressor.threshold.value).toBe(-20);
    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(2), 4);
    expect(engine.limiter.threshold.value).toBe(-1);
  });

  it('applies large speakers full-range EQ curve from base profile', () => {
    const engine = audioEngine as unknown as {
      harmonicWetGain: Tone.Gain;
      eq: Tone.EQ3;
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
      compressor: Tone.Compressor;
    };

    audioEngine.setOutputProfile(getOutputProfile('largeSpeakers'));

    expect(audioEngine.getEqProfileId()).toBe('largeSpeakers');
    expect(engine.eq.low.value).toBe(2);
    expect(engine.eq.mid.value).toBe(1);
    expect(engine.eq.high.value).toBe(-1.5);
    expect(engine.harmonicWetGain.gain.value).toBe(0);
    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(4), 4);
    expect(engine.compressor.threshold.value).toBe(-22);
    expect(engine.limiter.threshold.value).toBe(-1);
  });

  it('applies desktop-safe large speakers adaptation', () => {
    const engine = audioEngine as unknown as {
      harmonicWetGain: Tone.Gain;
      eq: Tone.EQ3;
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
      compressor: Tone.Compressor;
    };

    audioEngine.setOutputProfile(getAdaptedOutputProfile('largeSpeakers', 'desktop'));

    expect(engine.eq.low.value).toBe(2);
    expect(engine.harmonicWetGain.gain.value).toBe(0);
    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(0), 4);
    expect(engine.compressor.threshold.value).toBe(-20);
    expect(engine.compressor.ratio.value).toBe(2.5);
    expect(engine.compressor.release.value).toBe(0.12);
    expect(engine.limiter.threshold.value).toBe(-2.5);
  });

  it('applies modest mobile large speakers loudness bump on phone', () => {
    const engine = audioEngine as unknown as {
      harmonicWetGain: Tone.Gain;
      eq: Tone.EQ3;
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
      compressor: Tone.Compressor;
    };

    audioEngine.setOutputProfile(getAdaptedOutputProfile('largeSpeakers', 'phone'));

    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(3), 4);
    expect(engine.compressor.threshold.value).toBe(-23);
    expect(engine.compressor.ratio.value).toBe(2.5);
    expect(engine.compressor.release.value).toBe(0.12);
    expect(engine.limiter.threshold.value).toBe(-1.75);
  });

  it('applies desktop-safe small speakers adaptation', () => {
    const engine = audioEngine as unknown as {
      harmonicWetGain: Tone.Gain;
      eq: Tone.EQ3;
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
      compressor: Tone.Compressor;
    };

    audioEngine.setOutputProfile(getAdaptedOutputProfile('smallSpeakers', 'desktop'));

    expect(engine.eq.mid.value).toBe(2);
    expect(engine.harmonicWetGain.gain.value).toBe(0.08);
    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(0), 4);
    expect(engine.compressor.threshold.value).toBe(-20);
    expect(engine.compressor.ratio.value).toBe(2.5);
    expect(engine.compressor.release.value).toBe(0.12);
    expect(engine.limiter.threshold.value).toBe(-2.5);
  });

  it('applies modest mobile small speakers loudness bump on phone', () => {
    const engine = audioEngine as unknown as {
      harmonicWetGain: Tone.Gain;
      eq: Tone.EQ3;
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
      compressor: Tone.Compressor;
    };

    audioEngine.setOutputProfile(getAdaptedOutputProfile('smallSpeakers', 'phone'));

    expect(engine.eq.mid.value).toBe(2.5);
    expect(engine.harmonicWetGain.gain.value).toBe(0.14);
    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(3), 4);
    expect(engine.compressor.threshold.value).toBe(-23);
    expect(engine.compressor.ratio.value).toBe(2.5);
    expect(engine.compressor.release.value).toBe(0.12);
    expect(engine.limiter.threshold.value).toBe(-1.75);
  });
});

describe('AudioEngine instrument presets', () => {
  beforeEach(async () => {
    await audioEngine.startContext();
    audioEngine.releaseActiveNotes();
    await audioEngine.applyPreset(getSynthPreset('warmPad'));
  });

  it('applies a different synth class preset', async () => {
    await audioEngine.applyPreset(getSynthPreset('electricCello'));

    expect(audioEngine.getSynthPresetId()).toBe('electricCello');
    const engine = audioEngine as unknown as {
      currentSynthClass: string;
      voice: Tone.PolySynth;
    };
    expect(engine.currentSynthClass).toBe('FMSynth');
    expect(engine.voice.maxPolyphony).toBe(8);
  });

  it('hot-swaps options within the same synth class', async () => {
    await audioEngine.applyPreset(getSynthPreset('superSaw'));

    expect(audioEngine.getSynthPresetId()).toBe('superSaw');
    const engine = audioEngine as unknown as { currentSynthClass: string };
    expect(engine.currentSynthClass).toBe('Synth');
  });

  it('loads a sampler preset', async () => {
    await audioEngine.applyPreset(getSynthPreset('grandPiano'));

    expect(audioEngine.getSynthPresetId()).toBe('grandPiano');
    const engine = audioEngine as unknown as {
      voiceEngine: string;
      voice: Tone.Sampler;
    };
    expect(engine.voiceEngine).toBe('sampler');
    expect(engine.voice.triggerAttack).toBeDefined();
  });

  it('loads the violin sampler preset', async () => {
    await audioEngine.applyPreset(getSynthPreset('violin'));

    expect(audioEngine.getSynthPresetId()).toBe('violin');
    const engine = audioEngine as unknown as { voiceEngine: string };
    expect(engine.voiceEngine).toBe('sampler');
  });

  it('switches between sampler presets', async () => {
    await audioEngine.applyPreset(getSynthPreset('grandPiano'));
    const engine = audioEngine as unknown as { voice: Tone.Sampler };
    const pianoVoice = engine.voice;

    await audioEngine.applyPreset(getSynthPreset('cello'));

    expect(audioEngine.getSynthPresetId()).toBe('cello');
    expect(engine.voice).not.toBe(pianoVoice);
    expect(engine.voice.triggerAttack).toBeDefined();
  });

  it('retriggers identical pitches when retrigger is true', async () => {
    const engine = audioEngine as unknown as { voice: Tone.PolySynth };
    const attackSpy = vi.spyOn(engine.voice, 'triggerAttack');

    audioEngine.triggerAttack([60, 64, 67]);
    attackSpy.mockClear();
    audioEngine.triggerAttack([60, 64, 67], true);

    expect(attackSpy).toHaveBeenCalled();
  });

  it('uses natural sample release in drone mode for samplers', async () => {
    await audioEngine.applyPreset(getSynthPreset('grandPiano'));
    const engine = audioEngine as unknown as { voice: Tone.Sampler };
    const setSpy = vi.spyOn(engine.voice, 'set');

    audioEngine.setSamplerNaturalEnvelope(true);

    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        attack: 0.001,
        release: 1.2,
      }),
    );
  });

  it('applies attack and release to samplers in click-and-hold mode', async () => {
    await audioEngine.applyPreset(getSynthPreset('grandPiano'));
    const engine = audioEngine as unknown as { voice: Tone.Sampler };
    const setSpy = vi.spyOn(engine.voice, 'set');

    audioEngine.setSamplerNaturalEnvelope(false);
    audioEngine.applyEnvelopeSettings({
      attack: 0.05,
      decay: 0.2,
      sustain: 0.7,
      release: 0.9,
    });

    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        attack: 0.05,
        release: 0.9,
      }),
    );
  });

  it('applies JSON envelope settings including attackCurve', () => {
    const engine = audioEngine as unknown as {
      voice: Tone.PolySynth;
    };
    const setSpy = vi.spyOn(engine.voice, 'set');

    audioEngine.applyEnvelopeSettings({
      attack: 0.01,
      decay: 0.1,
      sustain: 0.5,
      release: 0.4,
      attackCurve: 'exponential',
    });

    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        envelope: expect.objectContaining({ attackCurve: 'exponential' }),
      }),
    );
  });
});
