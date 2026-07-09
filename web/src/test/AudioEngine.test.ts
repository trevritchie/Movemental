import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Tone from 'tone';
import { audioEngine } from '../audio/AudioEngine';
import {
  dbToGain,
  getOutputProfile,
} from '../audio/outputProfiles';
import { getSynthPreset } from '../audio/synthPresets';

describe('AudioEngine.playNotes', () => {
  beforeEach(async () => {
    await audioEngine.startContext();
    audioEngine.releaseActiveNotes();
  });

  it('tracks active notes so the next playNotes releases them', () => {
    const synth = (audioEngine as unknown as { synth: Tone.PolySynth }).synth;
    const releaseSpy = vi.spyOn(synth, 'triggerRelease');

    audioEngine.playNotes([60, 64, 67], '2n');
    audioEngine.playNotes([62, 65], '2n');

    expect(releaseSpy).toHaveBeenCalled();
    const firstReleaseArg = releaseSpy.mock.calls[0]?.[0];
    expect(firstReleaseArg).toEqual(expect.arrayContaining(['C4', 'E4', 'G4']));
  });
});

describe('AudioEngine output profiles', () => {
  beforeEach(async () => {
    await audioEngine.startContext();
    audioEngine.releaseActiveNotes();
    audioEngine.setOutputProfile(getOutputProfile('smallSpeakers'));
  });

  it('switches to studio profile with harmonic enhance bypassed', () => {
    const engine = audioEngine as unknown as {
      eq: Tone.EQ3;
      harmonicWetGain: Tone.Gain;
      compressor: Tone.Compressor;
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
    };

    audioEngine.setOutputProfile(getOutputProfile('studio'));

    expect(audioEngine.getOutputProfileId()).toBe('studio');
    expect(engine.eq.low.value).toBe(0);
    expect(engine.eq.mid.value).toBe(0);
    expect(engine.harmonicWetGain.gain.value).toBe(0);
    expect(engine.compressor.threshold.value).toBe(-20);
    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(2), 4);
    expect(engine.limiter.threshold.value).toBe(-1);
  });

  it('enables harmonic enhance in small speakers profile', () => {
    const engine = audioEngine as unknown as {
      harmonicWetGain: Tone.Gain;
      eq: Tone.EQ3;
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
    };

    audioEngine.setOutputProfile(getOutputProfile('smallSpeakers'));

    expect(engine.eq.mid.value).toBe(3);
    expect(engine.harmonicWetGain.gain.value).toBe(0.2);
    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(4), 4);
    expect(engine.limiter.threshold.value).toBe(-1);
  });
});

describe('AudioEngine instrument presets', () => {
  beforeEach(async () => {
    await audioEngine.startContext();
    audioEngine.releaseActiveNotes();
    audioEngine.applyPreset(getSynthPreset('warmPad'));
  });

  it('applies a different synth class preset', () => {
    audioEngine.applyPreset(getSynthPreset('electricCello'));

    expect(audioEngine.getSynthPresetId()).toBe('electricCello');
    const engine = audioEngine as unknown as {
      currentSynthClass: string;
      synth: Tone.PolySynth;
    };
    expect(engine.currentSynthClass).toBe('FMSynth');
    expect(engine.synth.maxPolyphony).toBe(8);
  });

  it('hot-swaps options within the same synth class', () => {
    audioEngine.applyPreset(getSynthPreset('superSaw'));

    expect(audioEngine.getSynthPresetId()).toBe('superSaw');
    const engine = audioEngine as unknown as { currentSynthClass: string };
    expect(engine.currentSynthClass).toBe('Synth');
  });
});
