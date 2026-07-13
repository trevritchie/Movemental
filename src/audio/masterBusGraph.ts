/**
 * Shared master bus graph: filter through limiter (live engine + offline tests).
 */
import * as Tone from 'tone';
import {
  ATTACK_SCHEDULE_OFFSET_SEC,
  BUS_HEADROOM_DB,
  CHORUS_DELAY_MS,
  CHORUS_DEPTH,
  CHORUS_LFO_HZ,
  DELAY_FEEDBACK,
  DELAY_TIME,
  FILTER_CUTOFF_HZ,
  FILTER_ROLLOFF_DB,
  FX_SEND_ATTENUATION_DB,
  HARMONIC_WET_ATTENUATION_DB,
  REVERB_DECAY_SEC,
  REVERB_PRE_DELAY_SEC,
} from './busConstants';
import {
  dbToGain,
  getEffectiveSynthVolumeDb,
  type OutputProfile,
} from './outputProfiles';
import { resolveSampleBaseUrl } from './samplePaths';
import {
  getMaxPolyphony,
  isSamplerPreset,
  voiceOptionsWithoutEnvelope,
  type InstrumentEngine,
  type PresetEnvelopeSettings,
  type SynthClassName,
  type SynthPreset,
} from './synthPresets';
import { clamp } from '../utils/clamp';

type InstrumentVoice = Tone.PolySynth | Tone.Sampler;

const SYNTH_CLASS_MAP = {
  Synth: Tone.Synth,
  FMSynth: Tone.FMSynth,
  AMSynth: Tone.AMSynth,
  MonoSynth: Tone.MonoSynth,
} as const;

export interface MasterBusGraphOptions {
  profile: OutputProfile;
  preset: SynthPreset;
  envelope: PresetEnvelopeSettings;
  chorusWet: number;
  delayWet: number;
  reverbWet: number;
  sampleBaseUrlResolver?: (relativeOrAbsolute: string) => string;
  connectToDestination?: boolean;
}

export interface MasterBusGraph {
  voice: InstrumentVoice;
  voiceEngine: InstrumentEngine;
  voiceClass: SynthClassName;
  limiter: Tone.Limiter;
  filter: Tone.Filter;
  chorus: Tone.Chorus;
  delay: Tone.PingPongDelay;
  reverb: Tone.Reverb;
  eq: Tone.EQ3;
  compressor: Tone.Compressor;
  masterMakeup: Tone.Gain;
  harmonicHpf: Tone.Filter;
  harmonicDistortion: Tone.Distortion;
  harmonicWetGain: Tone.Gain;
  harmonicDryGain: Tone.Gain;
  ready: Promise<void>;
  triggerAttack(noteNames: string[], time?: number): void;
  applyHarmonicEnhance(profile: OutputProfile, preset: SynthPreset): void;
  applyEqProfile(profile: OutputProfile): void;
  applyLoudnessProfile(profile: OutputProfile, preset: SynthPreset): void;
  setFxWet(chorus: number, delay: number, reverb: number): void;
  dispose(): void;
}

function resolveBaseUrl(
  url: string,
  resolver?: (relativeOrAbsolute: string) => string,
): string {
  return resolver ? resolver(url) : resolveSampleBaseUrl(url);
}

function createSynthVoice(
  preset: SynthPreset,
  profile: OutputProfile,
  envelope: PresetEnvelopeSettings,
): { voice: Tone.PolySynth; voiceClass: SynthClassName } {
  const synthClass = preset.synthClass ?? 'Synth';
  const SynthClass = SYNTH_CLASS_MAP[synthClass];
  const synth = new Tone.PolySynth(
    SynthClass as unknown as typeof Tone.Synth,
    {
      ...voiceOptionsWithoutEnvelope(preset.voiceOptions ?? {}),
      envelope: envelope as unknown as Record<string, unknown>,
      volume: getEffectiveSynthVolumeDb(preset, profile),
    },
  );
  synth.maxPolyphony = getMaxPolyphony(synthClass);
  return { voice: synth, voiceClass: synthClass };
}

function loadSamplerVoice(
  preset: SynthPreset,
  profile: OutputProfile,
  envelope: PresetEnvelopeSettings,
  sampleBaseUrlResolver?: (relativeOrAbsolute: string) => string,
): Promise<Tone.Sampler> {
  const samplerConfig = preset.sampler;
  if (!samplerConfig) {
    return Promise.reject(
      new Error(`Sampler preset "${preset.id}" is missing sample map`),
    );
  }

  return new Promise((resolve, reject) => {
    const sampler = new Tone.Sampler({
      urls: samplerConfig.urls,
      baseUrl: resolveBaseUrl(samplerConfig.baseUrl, sampleBaseUrlResolver),
      attack: envelope.attack,
      release: envelope.release,
      volume: getEffectiveSynthVolumeDb(preset, profile),
      onload: () => resolve(sampler),
      onerror: (error) => reject(error),
    });
  });
}

function applyHarmonicEnhanceToNodes(
  profile: OutputProfile,
  preset: SynthPreset,
  nodes: Pick<
    MasterBusGraph,
    'harmonicHpf' | 'harmonicDistortion' | 'harmonicWetGain' | 'harmonicDryGain'
  >,
): void {
  const { harmonicEnhance } = profile;
  const presetAllows = preset.harmonicEnhanceEnabled !== false;
  nodes.harmonicHpf.frequency.value = harmonicEnhance.hpfHz;
  nodes.harmonicDistortion.distortion = harmonicEnhance.distortion;
  const wetLevel =
    presetAllows && harmonicEnhance.enabled ? harmonicEnhance.wet : 0;
  nodes.harmonicWetGain.gain.value =
    wetLevel * dbToGain(HARMONIC_WET_ATTENUATION_DB);
  nodes.harmonicDryGain.gain.value = 1;
}

export async function buildMasterBusGraph(
  options: MasterBusGraphOptions,
): Promise<MasterBusGraph> {
  const {
    profile,
    preset,
    envelope,
    chorusWet,
    delayWet,
    reverbWet,
    sampleBaseUrlResolver,
    connectToDestination = true,
  } = options;

  const limiter = connectToDestination
    ? new Tone.Limiter(profile.loudness.limiterCeilingDb).toDestination()
    : new Tone.Limiter(profile.loudness.limiterCeilingDb);

  const masterMakeup = new Tone.Gain(dbToGain(profile.loudness.masterMakeupDb));
  masterMakeup.connect(limiter);

  const compressor = new Tone.Compressor({
    threshold: profile.loudness.compressor.threshold,
    ratio: profile.loudness.compressor.ratio,
    knee: profile.loudness.compressor.knee,
    attack: profile.loudness.compressor.attack,
    release: profile.loudness.compressor.release,
  });
  compressor.connect(masterMakeup);

  const eq = new Tone.EQ3({
    low: profile.eq.low,
    mid: profile.eq.mid,
    high: profile.eq.high,
    lowFrequency: profile.eq.lowFrequency,
    highFrequency: profile.eq.highFrequency,
  });
  eq.connect(compressor);

  const reverb = new Tone.Reverb({
    decay: REVERB_DECAY_SEC,
    wet: reverbWet,
    preDelay: REVERB_PRE_DELAY_SEC,
  });
  reverb.connect(eq);

  const delay = new Tone.PingPongDelay({
    delayTime: DELAY_TIME,
    feedback: DELAY_FEEDBACK,
    wet: delayWet,
  });
  delay.connect(reverb);

  const chorus = new Tone.Chorus({
    frequency: CHORUS_LFO_HZ,
    delayTime: CHORUS_DELAY_MS,
    depth: CHORUS_DEPTH,
    wet: chorusWet,
  });
  chorus.connect(delay);
  chorus.start();

  const harmonicMerge = new Tone.Gain(1);
  const fxSendGain = new Tone.Gain(dbToGain(FX_SEND_ATTENUATION_DB));
  fxSendGain.connect(chorus);
  harmonicMerge.connect(fxSendGain);

  const harmonicDryGain = new Tone.Gain(1);
  const harmonicWetGain = new Tone.Gain(0);
  const harmonicHpf = new Tone.Filter({
    type: 'highpass',
    frequency: profile.harmonicEnhance.hpfHz,
    rolloff: -12,
  });
  const harmonicDistortion = new Tone.Distortion(
    profile.harmonicEnhance.distortion,
  );
  harmonicDryGain.connect(harmonicMerge);
  harmonicHpf.connect(harmonicDistortion);
  harmonicDistortion.connect(harmonicWetGain);
  harmonicWetGain.connect(harmonicMerge);

  const busHeadroom = new Tone.Gain(dbToGain(BUS_HEADROOM_DB));
  const filter = new Tone.Filter({
    frequency: preset.filterCutoffHz ?? FILTER_CUTOFF_HZ,
    type: 'lowpass',
    rolloff: FILTER_ROLLOFF_DB,
  });
  filter.connect(busHeadroom);
  busHeadroom.connect(harmonicDryGain);
  busHeadroom.connect(harmonicHpf);

  const partialGraph = {
    harmonicHpf,
    harmonicDistortion,
    harmonicWetGain,
    harmonicDryGain,
  };
  applyHarmonicEnhanceToNodes(profile, preset, partialGraph);

  const reverbReady = reverb.generate();

  let voice: InstrumentVoice;
  let voiceEngine: InstrumentEngine;
  let voiceClass: SynthClassName;

  if (isSamplerPreset(preset)) {
    voiceEngine = 'sampler';
    voiceClass = 'Synth';
    const sampler = await loadSamplerVoice(
      preset,
      profile,
      envelope,
      sampleBaseUrlResolver,
    );
    voice = sampler;
    voice.connect(filter);
  } else {
    const created = createSynthVoice(preset, profile, envelope);
    voice = created.voice;
    voiceClass = created.voiceClass;
    voiceEngine = 'synth';
    voice.connect(filter);
  }

  const graph: MasterBusGraph = {
    voice,
    voiceEngine,
    voiceClass,
    limiter,
    filter,
    chorus,
    delay,
    reverb,
    eq,
    compressor,
    masterMakeup,
    harmonicHpf,
    harmonicDistortion,
    harmonicWetGain,
    harmonicDryGain,
    ready: Promise.all([reverbReady]).then(() => undefined),
    triggerAttack(noteNames: string[], time = ATTACK_SCHEDULE_OFFSET_SEC) {
      voice.triggerAttack(noteNames, time);
    },
    applyHarmonicEnhance(nextProfile, nextPreset) {
      applyHarmonicEnhanceToNodes(nextProfile, nextPreset, partialGraph);
    },
    applyEqProfile(nextProfile) {
      eq.low.value = nextProfile.eq.low;
      eq.mid.value = nextProfile.eq.mid;
      eq.high.value = nextProfile.eq.high;
      eq.lowFrequency.value = nextProfile.eq.lowFrequency;
      eq.highFrequency.value = nextProfile.eq.highFrequency;
    },
    applyLoudnessProfile(nextProfile, nextPreset) {
      masterMakeup.gain.value = dbToGain(nextProfile.loudness.masterMakeupDb);
      limiter.threshold.value = nextProfile.loudness.limiterCeilingDb;
      compressor.threshold.value = nextProfile.loudness.compressor.threshold;
      compressor.ratio.value = nextProfile.loudness.compressor.ratio;
      compressor.knee.value = nextProfile.loudness.compressor.knee;
      compressor.attack.value = nextProfile.loudness.compressor.attack;
      compressor.release.value = nextProfile.loudness.compressor.release;
      voice.volume.value = getEffectiveSynthVolumeDb(nextPreset, nextProfile);
    },
    setFxWet(nextChorus, nextDelay, nextReverb) {
      chorus.wet.value = clamp(nextChorus, 0, 1);
      delay.wet.value = clamp(nextDelay, 0, 1);
      reverb.wet.value = clamp(nextReverb, 0, 1);
    },
    dispose() {
      voice.disconnect();
      if (voiceEngine === 'synth') {
        (voice as Tone.PolySynth).dispose();
      }
      filter.dispose();
      busHeadroom.dispose();
      harmonicDryGain.dispose();
      harmonicWetGain.dispose();
      harmonicHpf.dispose();
      harmonicDistortion.dispose();
      harmonicMerge.dispose();
      fxSendGain.dispose();
      chorus.dispose();
      delay.dispose();
      reverb.dispose();
      eq.dispose();
      compressor.dispose();
      masterMakeup.dispose();
      limiter.dispose();
    },
  };

  await graph.ready;
  return graph;
}
