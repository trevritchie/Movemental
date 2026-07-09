/**
 * Playback EQ profiles for small, large, and flat reference playback.
 */
import { resolveLayoutTier, type LayoutTier } from '../layout/breakpoints';
import type { SynthPreset } from './synthPresets';

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
      distortion: 0.15,
      wet: 0,
    },
    loudness: {
      synthVolumeDb: -7,
      masterMakeupDb: 4,
      limiterCeilingDb: -1.0,
      fxScale: 0.95,
      compressor: {
        threshold: -22,
        ratio: 2.8,
        knee: 5,
        attack: 0.03,
        release: 0.08,
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

export function resolveDefaultEqProfileId(_tier?: LayoutTier): EqProfileId {
  return 'smallSpeakers';
}

/** @deprecated Use resolveDefaultEqProfileId */
export const resolveDefaultOutputProfileId = resolveDefaultEqProfileId;

export function getOutputProfile(id: EqProfileId): OutputProfile {
  return OUTPUT_PROFILES[id];
}

export function getAdaptedOutputProfile(
  id: EqProfileId,
  tier?: LayoutTier,
): OutputProfile {
  const base = getOutputProfile(id);
  if (id !== 'smallSpeakers') {
    return base;
  }

  const layoutTier = tier ?? resolveLayoutTier();
  if (layoutTier === 'desktop') {
    return {
      ...base,
      eq: { ...base.eq, mid: 2 },
      harmonicEnhance: {
        ...base.harmonicEnhance,
        distortion: 0.08,
        wet: 0.08,
      },
      loudness: {
        ...base.loudness,
        synthVolumeDb: -7,
        masterMakeupDb: 2,
        fxScale: 0.85,
        compressor: {
          ...base.loudness.compressor,
          threshold: -22,
        },
      },
    };
  }

  return {
    ...base,
    loudness: {
      ...base.loudness,
      synthVolumeDb: -4,
      masterMakeupDb: 6,
      fxScale: 0.8,
      compressor: {
        ...base.loudness.compressor,
        threshold: -26,
      },
    },
  };
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
  return Math.max(0, Math.min(1, baseWet * profile.loudness.fxScale));
}
