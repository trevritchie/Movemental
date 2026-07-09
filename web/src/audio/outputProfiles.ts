/**
 * Output translation profiles for small-device vs studio reference playback.
 */
import type { SynthPreset } from './synthPresets';

export type OutputProfileId = 'smallSpeakers' | 'studio';

export interface OutputProfile {
  id: OutputProfileId;
  label: string;
  eq: {
    low: number;
    mid: number;
    high: number;
    lowFrequency: number;
    highFrequency: number;
  };
  harmonicEnhance: {
    enabled: boolean;
    hpfHz: number;
    distortion: number;
    wet: number;
  };
  loudness: {
    synthVolumeDb: number;
    masterMakeupDb: number;
    limiterCeilingDb: number;
    fxScale: number;
    compressor: {
      threshold: number;
      ratio: number;
      knee: number;
      attack: number;
      release: number;
    };
  };
}

export const OUTPUT_PROFILES: Record<OutputProfileId, OutputProfile> = {
  smallSpeakers: {
    id: 'smallSpeakers',
    label: 'Small Speakers',
    eq: {
      low: -6,
      mid: 3,
      high: -2.5,
      lowFrequency: 180,
      highFrequency: 2400,
    },
    harmonicEnhance: {
      enabled: true,
      hpfHz: 180,
      distortion: 0.15,
      wet: 0.2,
    },
    loudness: {
      synthVolumeDb: -6,
      masterMakeupDb: 4,
      limiterCeilingDb: -1.0,
      fxScale: 0.85,
      compressor: {
        threshold: -24,
        ratio: 3.0,
        knee: 6,
        attack: 0.03,
        release: 0.08,
      },
    },
  },
  studio: {
    id: 'studio',
    label: 'Studio',
    eq: {
      low: 0,
      mid: 0,
      high: 0,
      lowFrequency: 200,
      highFrequency: 4000,
    },
    harmonicEnhance: {
      enabled: false,
      hpfHz: 180,
      distortion: 0.15,
      wet: 0,
    },
    loudness: {
      synthVolumeDb: -9,
      masterMakeupDb: 2,
      limiterCeilingDb: -1.0,
      fxScale: 1.0,
      compressor: {
        threshold: -20,
        ratio: 2.5,
        knee: 4,
        attack: 0.03,
        release: 0.08,
      },
    },
  },
};

export const DEFAULT_OUTPUT_PROFILE_ID: OutputProfileId = 'smallSpeakers';

const REFERENCE_SYNTH_VOLUME_DB =
  OUTPUT_PROFILES.smallSpeakers.loudness.synthVolumeDb;

export function getOutputProfile(id: OutputProfileId): OutputProfile {
  return OUTPUT_PROFILES[id];
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/** Profile-adjusted synth level: preset trim plus studio/small-speaker offset. */
export function getEffectiveSynthVolumeDb(
  preset: SynthPreset,
  profile: OutputProfile,
): number {
  const presetDb = preset.volumeDb ?? REFERENCE_SYNTH_VOLUME_DB;
  return (
    presetDb + (profile.loudness.synthVolumeDb - REFERENCE_SYNTH_VOLUME_DB)
  );
}

export function scaleFxWet(baseWet: number, profile: OutputProfile): number {
  return Math.max(0, Math.min(1, baseWet * profile.loudness.fxScale));
}
