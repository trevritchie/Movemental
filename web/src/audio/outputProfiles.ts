/**
 * Output translation profiles for small-device vs studio reference playback.
 */

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
  compressor: {
    threshold: number;
    ratio: number;
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
    compressor: {
      threshold: -18,
      ratio: 4.0,
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
    compressor: {
      threshold: -16,
      ratio: 4.0,
    },
  },
};

export const DEFAULT_OUTPUT_PROFILE_ID: OutputProfileId = 'smallSpeakers';

export function getOutputProfile(id: OutputProfileId): OutputProfile {
  return OUTPUT_PROFILES[id];
}
