/**
 * Shared FX and envelope defaults for sample-based instrument presets.
 */
import { samplePackBaseUrl } from './samplePaths';
import {
  TONEJS_INSTRUMENTS,
  type TonejsInstrumentDefinition,
} from './tonejsInstruments.generated';

export interface BuiltSamplerPreset {
  id: string;
  name: string;
  engine: 'sampler';
  sampler: {
    baseUrl: string;
    urls: Record<string, string>;
    release: number;
  };
  volumeDb: number;
  filterCutoffHz: number;
  harmonicEnhanceEnabled: false;
  fxDefaults: {
    chorusWet: number;
    delayWet: number;
    reverbWet: number;
  };
  envelopeDefaults: {
    tapAndHold: {
      attack: number;
      decay: number;
      sustain: number;
      release: number;
    };
    tap: {
      attack: number;
      decay: number;
      sustain: number;
      release: number;
    };
  };
}

type SamplerProfileKind =
  | 'keyboard'
  | 'string'
  | 'plucked'
  | 'woodwind'
  | 'brass'
  | 'mallet'
  | 'bass';

interface SamplerProfile {
  kind: SamplerProfileKind;
  volumeDb: number;
  filterCutoffHz: number;
  release: number;
  reverbWet: number;
  tapAndHold: BuiltSamplerPreset['envelopeDefaults']['tapAndHold'];
  tap: BuiltSamplerPreset['envelopeDefaults']['tap'];
}

const PROFILE_BY_KIND: Record<SamplerProfileKind, SamplerProfile> = {
  keyboard: {
    kind: 'keyboard',
    volumeDb: -8,
    filterCutoffHz: 12000,
    release: 1.0,
    reverbWet: 0.12,
    tapAndHold: {
      attack: 0.001,
      decay: 0.3,
      sustain: 0.85,
      release: 1.0,
    },
    tap: {
      attack: 0.05,
      decay: 0.5,
      sustain: 0.6,
      release: 0.8,
    },
  },
  string: {
    kind: 'string',
    volumeDb: -8,
    filterCutoffHz: 10000,
    release: 0.9,
    reverbWet: 0.18,
    tapAndHold: {
      attack: 0.08,
      decay: 0.4,
      sustain: 0.75,
      release: 0.9,
    },
    tap: {
      attack: 0.2,
      decay: 0.6,
      sustain: 0.55,
      release: 0.7,
    },
  },
  plucked: {
    kind: 'plucked',
    volumeDb: -8,
    filterCutoffHz: 9000,
    release: 0.55,
    reverbWet: 0.1,
    tapAndHold: {
      attack: 0.002,
      decay: 0.25,
      sustain: 0.35,
      release: 0.55,
    },
    tap: {
      attack: 0.04,
      decay: 0.35,
      sustain: 0.25,
      release: 0.45,
    },
  },
  woodwind: {
    kind: 'woodwind',
    volumeDb: -8,
    filterCutoffHz: 11000,
    release: 0.75,
    reverbWet: 0.14,
    tapAndHold: {
      attack: 0.04,
      decay: 0.35,
      sustain: 0.7,
      release: 0.75,
    },
    tap: {
      attack: 0.12,
      decay: 0.5,
      sustain: 0.5,
      release: 0.65,
    },
  },
  brass: {
    kind: 'brass',
    volumeDb: -8,
    filterCutoffHz: 10000,
    release: 0.8,
    reverbWet: 0.16,
    tapAndHold: {
      attack: 0.03,
      decay: 0.35,
      sustain: 0.72,
      release: 0.8,
    },
    tap: {
      attack: 0.1,
      decay: 0.55,
      sustain: 0.52,
      release: 0.7,
    },
  },
  mallet: {
    kind: 'mallet',
    volumeDb: -8,
    filterCutoffHz: 12000,
    release: 0.45,
    reverbWet: 0.08,
    tapAndHold: {
      attack: 0.001,
      decay: 0.2,
      sustain: 0.2,
      release: 0.45,
    },
    tap: {
      attack: 0.01,
      decay: 0.25,
      sustain: 0.15,
      release: 0.35,
    },
  },
  bass: {
    kind: 'bass',
    volumeDb: -8,
    filterCutoffHz: 7000,
    release: 0.7,
    reverbWet: 0.08,
    tapAndHold: {
      attack: 0.005,
      decay: 0.35,
      sustain: 0.65,
      release: 0.7,
    },
    tap: {
      attack: 0.06,
      decay: 0.45,
      sustain: 0.45,
      release: 0.6,
    },
  },
};

/**
 * Per-instrument loudness trim (measured on smallSpeakers; applied on every EQ).
 * Falls back to the kind profile when unset.
 */
const PRESET_VOLUME_DB: Partial<Record<string, number>> = {
  bassoon: -4,
  cello: -8,
  clarinet: -11.5,
  flute: -8.5,
  'french-horn': -9,
  'guitar-acoustic': -3,
  'guitar-electric': -6.5,
  'guitar-nylon': -2.5,
  harmonium: -9,
  harp: -5,
  organ: -8,
  piano: -7,
  saxophone: -8,
  trombone: -9,
  trumpet: -10,
  tuba: -6,
  violin: -6.5,
  xylophone: -2,
};

const KIND_BY_INSTRUMENT_ID: Record<string, SamplerProfileKind> = {
  'bass-electric': 'bass',
  bassoon: 'woodwind',
  cello: 'string',
  clarinet: 'woodwind',
  contrabass: 'bass',
  flute: 'woodwind',
  'french-horn': 'brass',
  'guitar-acoustic': 'plucked',
  'guitar-electric': 'plucked',
  'guitar-nylon': 'plucked',
  harmonium: 'keyboard',
  harp: 'plucked',
  organ: 'keyboard',
  piano: 'keyboard',
  saxophone: 'woodwind',
  trombone: 'brass',
  trumpet: 'brass',
  tuba: 'brass',
  violin: 'string',
  xylophone: 'mallet',
};

function buildTonejsSamplerPreset(
  instrument: TonejsInstrumentDefinition,
): BuiltSamplerPreset {
  const kind = KIND_BY_INSTRUMENT_ID[instrument.id] ?? 'string';
  const profile = PROFILE_BY_KIND[kind];

  return {
    id: instrument.id,
    name: instrument.name,
    engine: 'sampler',
    sampler: {
      baseUrl: samplePackBaseUrl(instrument.id),
      urls: instrument.urls,
      release: profile.release,
    },
    volumeDb: PRESET_VOLUME_DB[instrument.id] ?? profile.volumeDb,
    filterCutoffHz: profile.filterCutoffHz,
    harmonicEnhanceEnabled: false,
    fxDefaults: {
      chorusWet: 0,
      delayWet: 0,
      reverbWet: profile.reverbWet,
    },
    envelopeDefaults: {
      tapAndHold: profile.tapAndHold,
      tap: profile.tap,
    },
  };
}

const EXCLUDED_TONEJS_INSTRUMENT_IDS = new Set([
  'bass-electric',
  'contrabass',
]);

export const TONEJS_SAMPLER_PRESETS: BuiltSamplerPreset[] = TONEJS_INSTRUMENTS.filter(
  (instrument) => !EXCLUDED_TONEJS_INSTRUMENT_IDS.has(instrument.id),
).map(buildTonejsSamplerPreset);
