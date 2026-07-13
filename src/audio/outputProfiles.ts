/**
 * Playback EQ profiles for small, large, and flat reference playback.
 */
import { resolveLayoutTier, type LayoutTier } from '../layout/breakpoints';
import type { SynthPreset } from './synthPresets';
import { clamp } from '../utils/clamp';

export type EqProfileId = 'smallSpeakers' | 'largeSpeakers' | 'flat';

/** @deprecated Use EqProfileId */
export type OutputProfileId = EqProfileId;

export interface OutputProfile {
  id: EqProfileId;
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

export type EqProfile = OutputProfile;

/** Streaming-safe limiter ceiling (sample peak; margin for AAC inter-sample overs). */
export const LIMITER_CEILING_DB = -3.0;

export const OUTPUT_PROFILES: Record<EqProfileId, OutputProfile> = {
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
      distortion: 0.1,
      wet: 0.2,
    },
    loudness: {
      synthVolumeDb: -6,
      masterMakeupDb: 1.5,
      limiterCeilingDb: LIMITER_CEILING_DB,
      fxScale: 0.85,
      compressor: {
        threshold: -22,
        ratio: 2.2,
        knee: 6,
        attack: 0.03,
        release: 0.12,
      },
    },
  },
  largeSpeakers: {
    id: 'largeSpeakers',
    label: 'Large Speakers',
    eq: {
      low: 2,
      mid: 1,
      high: -1.5,
      lowFrequency: 100,
      highFrequency: 3500,
    },
    harmonicEnhance: {
      enabled: false,
      hpfHz: 180,
      distortion: 0.1,
      wet: 0,
    },
    loudness: {
      synthVolumeDb: -7,
      masterMakeupDb: 1.5,
      limiterCeilingDb: LIMITER_CEILING_DB,
      fxScale: 0.95,
      compressor: {
        threshold: -20,
        ratio: 2.2,
        knee: 5,
        attack: 0.03,
        release: 0.12,
      },
    },
  },
  flat: {
    id: 'flat',
    label: 'Flat',
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
      distortion: 0.1,
      wet: 0,
    },
    loudness: {
      synthVolumeDb: -12,
      masterMakeupDb: 0,
      limiterCeilingDb: LIMITER_CEILING_DB,
      fxScale: 1.0,
      compressor: {
        threshold: -20,
        ratio: 2.2,
        knee: 4,
        attack: 0.03,
        release: 0.12,
      },
    },
  },
};

/** @deprecated Use resolveDefaultEqProfileId() for tier-aware defaults. */
export const DEFAULT_OUTPUT_PROFILE_ID: EqProfileId = 'smallSpeakers';

const REFERENCE_SYNTH_VOLUME_DB =
  OUTPUT_PROFILES.smallSpeakers.loudness.synthVolumeDb;

const EQ_PROFILE_IDS: EqProfileId[] = ['smallSpeakers', 'largeSpeakers', 'flat'];

export function isEqProfileId(value: string): value is EqProfileId {
  return (EQ_PROFILE_IDS as string[]).includes(value);
}

/** Migrate legacy stored profile ids. */
export function normalizeEqProfileId(value: string): EqProfileId | null {
  if (value === 'studio') {
    return 'flat';
  }
  if (isEqProfileId(value)) {
    return value;
  }
  return null;
}

export function resolveDefaultEqProfileId(tier?: LayoutTier): EqProfileId {
  void tier;
  return 'smallSpeakers';
}

/** @deprecated Use resolveDefaultEqProfileId */
export const resolveDefaultOutputProfileId = resolveDefaultEqProfileId;

export function getOutputProfile(id: EqProfileId): OutputProfile {
  return OUTPUT_PROFILES[id];
}

const SMALL_SPEAKERS_DESKTOP: OutputProfile = {
  ...OUTPUT_PROFILES.smallSpeakers,
  eq: { ...OUTPUT_PROFILES.smallSpeakers.eq, mid: 2 },
  harmonicEnhance: {
    ...OUTPUT_PROFILES.smallSpeakers.harmonicEnhance,
    distortion: 0.06,
    wet: 0.08,
  },
  loudness: {
    ...OUTPUT_PROFILES.smallSpeakers.loudness,
    synthVolumeDb: -8,
    masterMakeupDb: 0,
    limiterCeilingDb: LIMITER_CEILING_DB,
    fxScale: 0.85,
    compressor: {
      ...OUTPUT_PROFILES.smallSpeakers.loudness.compressor,
      threshold: -20,
      ratio: 2.2,
      release: 0.12,
    },
  },
};

/** Phone tier: loudness via EQ and harmonic enhance, not gain into the limiter. */
const SMALL_SPEAKERS_MOBILE: OutputProfile = {
  ...SMALL_SPEAKERS_DESKTOP,
  eq: { ...SMALL_SPEAKERS_DESKTOP.eq, mid: 2.5 },
  harmonicEnhance: {
    ...SMALL_SPEAKERS_DESKTOP.harmonicEnhance,
    distortion: 0.08,
    wet: 0.16,
  },
  loudness: {
    ...SMALL_SPEAKERS_DESKTOP.loudness,
    synthVolumeDb: -8,
    masterMakeupDb: 0,
    limiterCeilingDb: LIMITER_CEILING_DB,
    fxScale: 0.825,
    compressor: {
      ...SMALL_SPEAKERS_DESKTOP.loudness.compressor,
      threshold: -20,
      ratio: 2.2,
    },
  },
};

const LARGE_SPEAKERS_DESKTOP: OutputProfile = {
  ...OUTPUT_PROFILES.largeSpeakers,
  loudness: {
    ...OUTPUT_PROFILES.largeSpeakers.loudness,
    synthVolumeDb: -8,
    masterMakeupDb: 0,
    limiterCeilingDb: LIMITER_CEILING_DB,
    fxScale: 0.9,
    compressor: {
      ...OUTPUT_PROFILES.largeSpeakers.loudness.compressor,
      threshold: -20,
      ratio: 2.2,
      release: 0.12,
    },
  },
};

/** Phone tier: same limiter ceiling as desktop; no makeup or synth boost. */
const LARGE_SPEAKERS_MOBILE: OutputProfile = {
  ...LARGE_SPEAKERS_DESKTOP,
  loudness: {
    ...LARGE_SPEAKERS_DESKTOP.loudness,
    synthVolumeDb: -8,
    masterMakeupDb: 0,
    limiterCeilingDb: LIMITER_CEILING_DB,
    fxScale: 0.875,
    compressor: {
      ...LARGE_SPEAKERS_DESKTOP.loudness.compressor,
      threshold: -20,
      ratio: 2.2,
    },
  },
};

export function getAdaptedOutputProfile(
  id: EqProfileId,
  tier?: LayoutTier,
): OutputProfile {
  const layoutTier = tier ?? resolveLayoutTier();
  if (id === 'smallSpeakers') {
    if (layoutTier === 'desktop') {
      return SMALL_SPEAKERS_DESKTOP;
    }
    return SMALL_SPEAKERS_MOBILE;
  }
  if (id === 'largeSpeakers') {
    if (layoutTier === 'desktop') {
      return LARGE_SPEAKERS_DESKTOP;
    }
    return LARGE_SPEAKERS_MOBILE;
  }
  return getOutputProfile(id);
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/** Profile-adjusted synth level: preset trim plus EQ-mode offset. */
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
  return clamp(baseWet * profile.loudness.fxScale, 0, 1);
}
