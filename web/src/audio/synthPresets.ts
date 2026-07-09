/**
 * Instrument presets — warmPad is native; others vendored from Tonejs/Presets.
 */
import superSawJson from './presets/SuperSaw.json';
import electricCelloJson from './presets/ElectricCello.json';
import kalimbaJson from './presets/Kalimba.json';
import harmonicsJson from './presets/Harmonics.json';
import pianoettaJson from './presets/Pianoetta.json';

export type SynthClassName = 'Synth' | 'FMSynth' | 'AMSynth' | 'MonoSynth';

export interface AdsrValues {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface SynthPreset {
  id: string;
  name: string;
  synthClass: SynthClassName;
  voiceOptions: Record<string, unknown>;
  volumeDb?: number;
  filterCutoffHz?: number;
  fxDefaults?: {
    chorusWet: number;
    delayWet: number;
    reverbWet: number;
  };
  envelopeDefaults?: {
    clickHold: AdsrValues;
    drone: AdsrValues;
  };
}

/** Shared click-and-hold envelope for pad-style presets. */
const PAD_CLICK_HOLD: AdsrValues = {
  attack: 0.15,
  decay: 2.0,
  sustain: 0.5,
  release: 2.5,
};

/** Shared drone envelope for ambient pad presets. */
const PAD_DRONE: AdsrValues = {
  attack: 0.6,
  decay: 3.5,
  sustain: 0.2,
  release: 0.5,
};

const PAD_FX = {
  chorusWet: 0.35,
  delayWet: 0.0,
  reverbWet: 0.3,
};

export const SYNTH_PRESETS: SynthPreset[] = [
  {
    id: 'warmPad',
    name: 'Warm Pad',
    synthClass: 'Synth',
    voiceOptions: {
      oscillator: {
        type: 'fatsawtooth',
        count: 3,
        spread: 15,
      },
    },
    volumeDb: -6,
    filterCutoffHz: 900,
    fxDefaults: PAD_FX,
    envelopeDefaults: {
      clickHold: PAD_CLICK_HOLD,
      drone: PAD_DRONE,
    },
  },
  {
    id: 'superSaw',
    name: 'Super Saw',
    synthClass: 'Synth',
    voiceOptions: superSawJson as Record<string, unknown>,
    volumeDb: -6,
    filterCutoffHz: 1200,
    fxDefaults: { chorusWet: 0.4, delayWet: 0.05, reverbWet: 0.25 },
    envelopeDefaults: {
      clickHold: { attack: 0.08, decay: 1.2, sustain: 0.55, release: 1.8 },
      drone: { attack: 0.5, decay: 2.5, sustain: 0.25, release: 0.4 },
    },
  },
  {
    id: 'electricCello',
    name: 'Electric Cello',
    synthClass: 'FMSynth',
    voiceOptions: electricCelloJson as Record<string, unknown>,
    volumeDb: -4,
    filterCutoffHz: 1000,
    fxDefaults: { chorusWet: 0.3, delayWet: 0.0, reverbWet: 0.4 },
    envelopeDefaults: {
      clickHold: { attack: 0.2, decay: 1.5, sustain: 0.45, release: 2.0 },
      drone: { attack: 0.8, decay: 3.0, sustain: 0.2, release: 0.6 },
    },
  },
  {
    id: 'kalimba',
    name: 'Kalimba',
    synthClass: 'FMSynth',
    voiceOptions: kalimbaJson as Record<string, unknown>,
    volumeDb: -3,
    filterCutoffHz: 1400,
    fxDefaults: { chorusWet: 0.2, delayWet: 0.1, reverbWet: 0.35 },
    envelopeDefaults: {
      clickHold: { attack: 0.05, decay: 1.8, sustain: 0.35, release: 2.2 },
      drone: { attack: 0.4, decay: 2.8, sustain: 0.15, release: 0.5 },
    },
  },
  {
    id: 'harmonics',
    name: 'Harmonics',
    synthClass: 'AMSynth',
    voiceOptions: harmonicsJson as Record<string, unknown>,
    volumeDb: -4,
    filterCutoffHz: 1100,
    fxDefaults: { chorusWet: 0.35, delayWet: 0.0, reverbWet: 0.35 },
    envelopeDefaults: {
      clickHold: { attack: 0.1, decay: 1.6, sustain: 0.5, release: 2.0 },
      drone: { attack: 0.7, decay: 3.2, sustain: 0.2, release: 0.55 },
    },
  },
  {
    id: 'pianoetta',
    name: 'Pianoetta',
    synthClass: 'MonoSynth',
    voiceOptions: pianoettaJson as Record<string, unknown>,
    volumeDb: -5,
    filterCutoffHz: 2000,
    fxDefaults: { chorusWet: 0.15, delayWet: 0.0, reverbWet: 0.25 },
    envelopeDefaults: {
      clickHold: { attack: 0.01, decay: 1.2, sustain: 0.3, release: 1.5 },
      drone: { attack: 0.3, decay: 2.0, sustain: 0.15, release: 0.35 },
    },
  },
];

export const DEFAULT_SYNTH_PRESET_ID = 'warmPad';

const PRESET_BY_ID = new Map(SYNTH_PRESETS.map((preset) => [preset.id, preset]));

export function getSynthPreset(id: string): SynthPreset {
  return PRESET_BY_ID.get(id) ?? PRESET_BY_ID.get(DEFAULT_SYNTH_PRESET_ID)!;
}

export function getMaxPolyphony(synthClass: SynthClassName): number {
  return synthClass === 'Synth' ? 12 : 8;
}
