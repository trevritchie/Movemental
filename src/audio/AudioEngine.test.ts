import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Tone from 'tone';

// Hoisted spies referenced inside vi.mock factories below.
const midiRecorderMock = vi.hoisted(() => ({
  start: vi.fn(),
  reset: vi.fn(),
  isRecording: vi.fn(() => false),
  logNoteOns: vi.fn(),
  logNoteOffs: vi.fn(),
  logAllNotesOff: vi.fn(),
  encode: vi.fn(async () => new Blob(['midi'], { type: 'audio/midi' })),
}));

vi.mock('./SessionMidiRecorder', () => ({
  SessionMidiRecorder: vi.fn(function SessionMidiRecorder() {
    return midiRecorderMock;
  }),
  pairEventsIntoNotes: vi.fn(),
}));

vi.mock('./SessionRecorder', () => ({
  SessionRecorder: {
    isSupported: vi.fn(() => true),
    create: vi.fn(() => ({
      attachSource: vi.fn(),
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => new Blob(['audio'], { type: 'audio/webm' })),
    })),
  },
}));

import { AudioEngine, audioEngine } from './AudioEngine';
import {
  dbToGain,
  getAdaptedOutputProfile,
  getOutputProfile,
  LIMITER_CEILING_DB,
} from './outputProfiles';
import { HARMONIC_WET_ATTENUATION_DB } from './busConstants';
import type { MasterBusGraph } from './masterBusGraph';
import { getSynthPreset } from './synthPresets';

function getBusNodes(engine: typeof audioEngine): MasterBusGraph {
  return (engine as unknown as { bus: MasterBusGraph }).bus;
}

describe('AudioEngine session MIDI recording', () => {
  let engine: AudioEngine;

  beforeEach(async () => {
    vi.clearAllMocks();
    midiRecorderMock.isRecording.mockReturnValue(false);
    engine = new AudioEngine();
    await engine.startContext();
  });

  it('starts the MIDI recorder when audio recording starts', async () => {
    vi.mocked(Tone.now).mockReturnValue(12.5);

    await engine.startRecording();

    expect(midiRecorderMock.start).toHaveBeenCalledWith(12.5);
  });

  it('returns audio and MIDI blobs when recording stops', async () => {
    vi.mocked(Tone.now).mockReturnValue(99);

    await engine.startRecording();
    const result = await engine.stopRecording();

    expect(result.audio.type).toBe('audio/webm');
    expect(result.midi.type).toBe('audio/midi');
    expect(midiRecorderMock.encode).toHaveBeenCalledWith(99);
  });

  it('logs playNotes events while MIDI recording is active', () => {
    midiRecorderMock.isRecording.mockReturnValue(true);
    vi.mocked(Tone.now).mockReturnValue(2);

    engine.playNotes([60, 64], '2n');

    expect(midiRecorderMock.logNoteOns).toHaveBeenCalledWith(
      [60, 64],
      undefined,
      2.005,
    );
    expect(midiRecorderMock.logNoteOffs).toHaveBeenCalledWith(
      [60, 64],
      3.005,
    );
  });

  it('logs all notes off when releaseActiveNotes runs during recording', () => {
    midiRecorderMock.isRecording.mockReturnValue(true);
    vi.mocked(Tone.now).mockReturnValue(5);

    engine.releaseActiveNotes();

    expect(midiRecorderMock.logAllNotesOff).toHaveBeenCalledWith(5);
  });

  it('releases voices on background and resumes context on foreground', async () => {
    engine.handlePageBackground();
    expect(engine.isPageBackgrounded()).toBe(true);

    await engine.handlePageForeground();
    expect(engine.isPageBackgrounded()).toBe(false);
    expect(Tone.start).toHaveBeenCalled();
  });

  it('notifies release listeners when panic runs', () => {
    const listener = vi.fn();
    engine.registerReleaseListener(listener);
    engine.releaseActiveNotes();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

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
    await audioEngine.applyPreset(getSynthPreset('warmPad'));
    audioEngine.setOutputProfile(getAdaptedOutputProfile('smallSpeakers', 'desktop'));
  });

  it('switches to flat profile with harmonic enhance bypassed', () => {
    const bus = getBusNodes(audioEngine);
    const engine = audioEngine as unknown as {
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
    };

    audioEngine.setOutputProfile(getOutputProfile('flat'));

    expect(audioEngine.getEqProfileId()).toBe('flat');
    expect(bus.eq.low.value).toBe(0);
    expect(bus.eq.mid.value).toBe(0);
    expect(bus.harmonicWetGain.gain.value).toBe(0);
    expect(bus.compressor.threshold.value).toBe(-20);
    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(0), 4);
    expect(engine.limiter.threshold.value).toBe(LIMITER_CEILING_DB);
  });

  it('applies large speakers full-range EQ curve from base profile', () => {
    const bus = getBusNodes(audioEngine);
    const engine = audioEngine as unknown as {
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
    };

    audioEngine.setOutputProfile(getOutputProfile('largeSpeakers'));

    expect(audioEngine.getEqProfileId()).toBe('largeSpeakers');
    expect(bus.eq.low.value).toBe(2);
    expect(bus.eq.mid.value).toBe(1);
    expect(bus.eq.high.value).toBe(-1.5);
    expect(bus.harmonicWetGain.gain.value).toBe(0);
    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(1.5), 4);
    expect(bus.compressor.threshold.value).toBe(-20);
    expect(engine.limiter.threshold.value).toBe(LIMITER_CEILING_DB);
  });

  it('applies desktop-safe large speakers adaptation', () => {
    const bus = getBusNodes(audioEngine);
    const engine = audioEngine as unknown as {
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
    };

    audioEngine.setOutputProfile(getAdaptedOutputProfile('largeSpeakers', 'desktop'));

    expect(bus.eq.low.value).toBe(2);
    expect(bus.harmonicWetGain.gain.value).toBe(0);
    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(0), 4);
    expect(bus.compressor.threshold.value).toBe(-20);
    expect(bus.compressor.ratio.value).toBe(2.2);
    expect(bus.compressor.release.value).toBe(0.12);
    expect(engine.limiter.threshold.value).toBe(LIMITER_CEILING_DB);
  });

  it('keeps mobile large speakers at the same limiter ceiling as desktop', () => {
    const bus = getBusNodes(audioEngine);
    const engine = audioEngine as unknown as {
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
    };

    audioEngine.setOutputProfile(getAdaptedOutputProfile('largeSpeakers', 'phone'));

    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(0), 4);
    expect(bus.compressor.threshold.value).toBe(-20);
    expect(bus.compressor.ratio.value).toBe(2.2);
    expect(bus.compressor.release.value).toBe(0.12);
    expect(engine.limiter.threshold.value).toBe(LIMITER_CEILING_DB);
  });

  it('applies desktop-safe small speakers adaptation', () => {
    const bus = getBusNodes(audioEngine);
    const engine = audioEngine as unknown as {
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
    };

    audioEngine.setOutputProfile(getAdaptedOutputProfile('smallSpeakers', 'desktop'));

    expect(bus.eq.mid.value).toBe(2);
    expect(bus.harmonicWetGain.gain.value).toBeCloseTo(
      0.08 * dbToGain(HARMONIC_WET_ATTENUATION_DB),
      4,
    );
    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(0), 4);
    expect(bus.compressor.threshold.value).toBe(-20);
    expect(bus.compressor.ratio.value).toBe(2.2);
    expect(bus.compressor.release.value).toBe(0.12);
    expect(engine.limiter.threshold.value).toBe(LIMITER_CEILING_DB);
  });

  it('uses harmonic enhance on phone without mobile makeup boost', () => {
    const bus = getBusNodes(audioEngine);
    const engine = audioEngine as unknown as {
      masterMakeup: Tone.Gain;
      limiter: Tone.Limiter;
    };

    audioEngine.setOutputProfile(getAdaptedOutputProfile('smallSpeakers', 'phone'));

    expect(bus.eq.mid.value).toBe(2.5);
    expect(bus.harmonicWetGain.gain.value).toBeCloseTo(
      0.16 * dbToGain(HARMONIC_WET_ATTENUATION_DB),
      4,
    );
    expect(engine.masterMakeup.gain.value).toBeCloseTo(dbToGain(0), 4);
    expect(bus.compressor.threshold.value).toBe(-20);
    expect(bus.compressor.ratio.value).toBe(2.2);
    expect(bus.compressor.release.value).toBe(0.12);
    expect(engine.limiter.threshold.value).toBe(LIMITER_CEILING_DB);
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

  it('sustains still-sounding synth common tones on legato chord change', async () => {
    await audioEngine.applyPreset(getSynthPreset('warmPad'));
    const engine = audioEngine as unknown as { voice: Tone.PolySynth };
    const attackSpy = vi.spyOn(engine.voice, 'triggerAttack');

    audioEngine.triggerAttack([60, 64, 67]);
    attackSpy.mockClear();
    audioEngine.triggerAttack([60, 65, 67]);

    expect(attackSpy).toHaveBeenCalledWith(['F4'], expect.anything());
  });

  it('re-attacks expired sampler common tones on legato chord change', async () => {
    await audioEngine.applyPreset(getSynthPreset('grandPiano'));
    const engine = audioEngine as unknown as {
      voice: Tone.Sampler;
      noteEndTimes: Map<string, number>;
    };
    const attackSpy = vi.spyOn(engine.voice, 'triggerAttack');

    vi.mocked(Tone.now).mockReturnValue(1);
    audioEngine.triggerAttack([60, 64, 67]);
    engine.noteEndTimes.set('C4', 1.5);
    engine.noteEndTimes.set('E4', 10);
    engine.noteEndTimes.set('G4', 10);
    attackSpy.mockClear();

    vi.mocked(Tone.now).mockReturnValue(2);
    audioEngine.triggerAttack([60, 65, 67]);

    const attacked = attackSpy.mock.calls[0]?.[0] as string[];
    expect(attacked).toEqual(expect.arrayContaining(['C4', 'F4']));
    expect(attacked).not.toContain('G4');
  });

  it('sustains sampler common tones that have not reached end time', async () => {
    await audioEngine.applyPreset(getSynthPreset('grandPiano'));
    const engine = audioEngine as unknown as {
      voice: Tone.Sampler;
      noteEndTimes: Map<string, number>;
    };
    const attackSpy = vi.spyOn(engine.voice, 'triggerAttack');

    vi.mocked(Tone.now).mockReturnValue(1);
    audioEngine.triggerAttack([60, 64, 67]);
    engine.noteEndTimes.set('C4', 10);
    engine.noteEndTimes.set('E4', 10);
    engine.noteEndTimes.set('G4', 10);
    attackSpy.mockClear();

    vi.mocked(Tone.now).mockReturnValue(2);
    audioEngine.triggerAttack([60, 65, 67]);

    expect(attackSpy).toHaveBeenCalledWith(['F4'], expect.anything());
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
