/**
 * Single source of truth for persisted user settings: defaults, validation,
 * section grouping, and derived types for load/save/reset.
 */
import {
  DEFAULT_TONAL_CENTER_OFFSET,
  DEFAULT_OCTAVE_RANGE,
  DEFAULT_VOICE_LEADING_MODE,
  DEFAULT_CLOCK_LAYOUT_MODE,
  MAX_OCTAVE_RANGE,
  MIN_OCTAVE_RANGE,
} from '../music/config';
import type {
  ClockLayoutMode,
  PlayStyle,
  VoiceLeadingMode,
} from '../music/sessionModes';
import {
  DEFAULT_EQ_PROFILE_ID,
  isEqProfileId,
  type EqProfileId,
} from '../audio/outputProfiles';
import {
  DEFAULT_SYNTH_PRESET_ID,
  getPresetTapAndHoldEnvelope,
  getPresetTapEnvelope,
  getPresetFxDefaults,
  getSynthPreset,
  isSamplerPreset,
  SYNTH_PRESETS,
} from '../audio/synthPresets';

export type SettingsSectionId =
  | 'general'
  | 'clockFace'
  | 'glowingOrbs'
  | 'voiceLeading'
  | 'voiceBorrowing'
  | 'soundDesign';

export const SETTINGS_SECTION_IDS: readonly SettingsSectionId[] = [
  'general',
  'clockFace',
  'glowingOrbs',
  'voiceLeading',
  'voiceBorrowing',
  'soundDesign',
] as const;

export const SETTINGS_SECTION_LABELS: Record<SettingsSectionId, string> = {
  general: 'Playback',
  clockFace: 'Clock Face Diagram',
  glowingOrbs: 'Glowing Orbs',
  voiceLeading: 'Voice Leading',
  voiceBorrowing: 'Voice Borrowing',
  soundDesign: 'Sound',
};

export type BorrowingMemoryMode = 'global' | 'per-chord';

type SettingDef<T> = {
  default: T;
  validate: (value: unknown) => value is T;
};

function isPitchClass(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 11
  );
}

function isOctaveRange(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_OCTAVE_RANGE &&
    value <= MAX_OCTAVE_RANGE
  );
}

function isPlayStyle(value: unknown): value is PlayStyle {
  return value === 'tap_and_hold' || value === 'tap';
}

/** Map legacy persisted play-style / envelope keys onto current names. */
function migrateLegacySettingsPayload(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const source = { ...raw };

  if (source.general && typeof source.general === 'object') {
    const general = { ...(source.general as Record<string, unknown>) };
    if (general.playStyle === 'drone') {
      general.playStyle = 'tap';
    } else if (general.playStyle === 'click_and_hold') {
      general.playStyle = 'tap_and_hold';
    }
    source.general = general;
  }

  if (source.soundDesign && typeof source.soundDesign === 'object') {
    const soundDesign = {
      ...(source.soundDesign as Record<string, unknown>),
    };
    const legacyPairs: Array<[string, string]> = [
      ['droneAttack', 'tapAttack'],
      ['droneDecay', 'tapDecay'],
      ['droneSustain', 'tapSustain'],
      ['droneRelease', 'tapRelease'],
    ];
    for (const [legacyKey, nextKey] of legacyPairs) {
      if (soundDesign[nextKey] === undefined && soundDesign[legacyKey] !== undefined) {
        soundDesign[nextKey] = soundDesign[legacyKey];
      }
      delete soundDesign[legacyKey];
    }
    source.soundDesign = soundDesign;
  }

  return source;
}

function isVoiceLeadingMode(value: unknown): value is VoiceLeadingMode {
  return (
    value === 'root_position' || value === 'smooth' || value === 'smoothest'
  );
}

function isBorrowingMemory(value: unknown): value is BorrowingMemoryMode {
  return value === 'global' || value === 'per-chord';
}

function isClockLayoutMode(value: unknown): value is ClockLayoutMode {
  return value === 'chromatic' || value === 'circle_of_fifths';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isWet(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isSynthPresetId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    SYNTH_PRESETS.some((preset) => preset.id === value)
  );
}

function isEqProfileIdValue(value: unknown): value is EqProfileId {
  return typeof value === 'string' && isEqProfileId(value);
}

export function getDefaultSoundDesignSettings(): SoundDesignSettings {
  const preset = getSynthPreset(DEFAULT_SYNTH_PRESET_ID);
  const fx = isSamplerPreset(preset)
    ? { chorusWet: 0, delayWet: 0, reverbWet: 0 }
    : getPresetFxDefaults(preset);
  const tapAndHold = getPresetTapAndHoldEnvelope(preset);
  const tap = getPresetTapEnvelope(preset);

  return {
    synthPresetId: DEFAULT_SYNTH_PRESET_ID,
    eqProfileId: DEFAULT_EQ_PROFILE_ID,
    chorusWet: fx.chorusWet,
    delayWet: fx.delayWet,
    reverbWet: fx.reverbWet,
    envelopeAttack: tapAndHold.attack,
    envelopeDecay: tapAndHold.decay,
    envelopeSustain: tapAndHold.sustain,
    envelopeRelease: tapAndHold.release,
    tapAttack: tap.attack,
    tapDecay: tap.decay,
    tapSustain: tap.sustain,
    tapRelease: tap.release,
  };
}

const DEFAULT_SOUND_DESIGN = getDefaultSoundDesignSettings();

export type GeneralSettings = {
  tonalCenter: number;
  octaveRange: number;
  playStyle: PlayStyle;
  /**
   * When true (tap sustain only), chord changes fully retrigger still-sounding
   * notes. Dead sampler notes always re-attack regardless of this flag.
   */
  retriggerSoundingNotes: boolean;
};

export type VoiceLeadingSettings = {
  mode: VoiceLeadingMode;
};

export type VoiceBorrowingSettings = {
  memory: BorrowingMemoryMode;
};

export type ClockFaceSettings = {
  layoutMode: ClockLayoutMode;
};

export type GlowingOrbsSettings = {
  enabled: boolean;
};

export type SoundDesignSettings = {
  synthPresetId: string;
  eqProfileId: EqProfileId;
  chorusWet: number;
  delayWet: number;
  reverbWet: number;
  envelopeAttack: number;
  envelopeDecay: number;
  envelopeSustain: number;
  envelopeRelease: number;
  tapAttack: number;
  tapDecay: number;
  tapSustain: number;
  tapRelease: number;
};

export const USER_SETTINGS_SCHEMA: Record<
  SettingsSectionId,
  Record<string, SettingDef<unknown>>
> = {
  general: {
    tonalCenter: {
      default: DEFAULT_TONAL_CENTER_OFFSET,
      validate: isPitchClass,
    },
    octaveRange: {
      default: DEFAULT_OCTAVE_RANGE,
      validate: isOctaveRange,
    },
    playStyle: {
      default: 'tap' as PlayStyle,
      validate: isPlayStyle,
    },
    retriggerSoundingNotes: {
      default: false,
      validate: isBoolean,
    },
  },
  clockFace: {
    layoutMode: {
      default: DEFAULT_CLOCK_LAYOUT_MODE,
      validate: isClockLayoutMode,
    },
  },
  glowingOrbs: {
    enabled: {
      default: true,
      validate: isBoolean,
    },
  },
  voiceLeading: {
    mode: {
      default: DEFAULT_VOICE_LEADING_MODE,
      validate: isVoiceLeadingMode,
    },
  },
  voiceBorrowing: {
    memory: {
      default: 'per-chord' as BorrowingMemoryMode,
      validate: isBorrowingMemory,
    },
  },
  soundDesign: {
    synthPresetId: {
      default: DEFAULT_SOUND_DESIGN.synthPresetId,
      validate: isSynthPresetId,
    },
    eqProfileId: {
      default: DEFAULT_SOUND_DESIGN.eqProfileId,
      validate: isEqProfileIdValue,
    },
    chorusWet: { default: DEFAULT_SOUND_DESIGN.chorusWet, validate: isWet },
    delayWet: { default: DEFAULT_SOUND_DESIGN.delayWet, validate: isWet },
    reverbWet: { default: DEFAULT_SOUND_DESIGN.reverbWet, validate: isWet },
    envelopeAttack: {
      default: DEFAULT_SOUND_DESIGN.envelopeAttack,
      validate: isPositiveNumber,
    },
    envelopeDecay: {
      default: DEFAULT_SOUND_DESIGN.envelopeDecay,
      validate: isPositiveNumber,
    },
    envelopeSustain: {
      default: DEFAULT_SOUND_DESIGN.envelopeSustain,
      validate: isWet,
    },
    envelopeRelease: {
      default: DEFAULT_SOUND_DESIGN.envelopeRelease,
      validate: isPositiveNumber,
    },
    tapAttack: {
      default: DEFAULT_SOUND_DESIGN.tapAttack,
      validate: isPositiveNumber,
    },
    tapDecay: {
      default: DEFAULT_SOUND_DESIGN.tapDecay,
      validate: isPositiveNumber,
    },
    tapSustain: {
      default: DEFAULT_SOUND_DESIGN.tapSustain,
      validate: isWet,
    },
    tapRelease: {
      default: DEFAULT_SOUND_DESIGN.tapRelease,
      validate: isPositiveNumber,
    },
  },
};

type SchemaSection<S extends SettingsSectionId> = S extends 'general'
  ? GeneralSettings
  : S extends 'clockFace'
    ? ClockFaceSettings
    : S extends 'glowingOrbs'
      ? GlowingOrbsSettings
  : S extends 'voiceLeading'
    ? VoiceLeadingSettings
    : S extends 'voiceBorrowing'
      ? VoiceBorrowingSettings
      : SoundDesignSettings;

export type PersistedUserSettings = {
  version: 1;
  general: GeneralSettings;
  clockFace: ClockFaceSettings;
  glowingOrbs: GlowingOrbsSettings;
  voiceLeading: VoiceLeadingSettings;
  voiceBorrowing: VoiceBorrowingSettings;
  soundDesign: SoundDesignSettings;
};

export type SettingKey =
  | keyof GeneralSettings
  | keyof ClockFaceSettings
  | keyof GlowingOrbsSettings
  | keyof VoiceLeadingSettings
  | keyof VoiceBorrowingSettings
  | keyof SoundDesignSettings;

function collectSectionDefaults<S extends SettingsSectionId>(
  sectionId: S
): SchemaSection<S> {
  const section = USER_SETTINGS_SCHEMA[sectionId];
  const result = {} as SchemaSection<S>;
  for (const key of Object.keys(section)) {
    const def = section[key];
    (result as Record<string, unknown>)[key] = def.default;
  }
  return result;
}

export const DEFAULT_USER_SETTINGS: PersistedUserSettings = {
  version: 1,
  general: collectSectionDefaults('general'),
  clockFace: collectSectionDefaults('clockFace'),
  glowingOrbs: collectSectionDefaults('glowingOrbs'),
  voiceLeading: collectSectionDefaults('voiceLeading'),
  voiceBorrowing: collectSectionDefaults('voiceBorrowing'),
  soundDesign: collectSectionDefaults('soundDesign'),
};

export function getSectionDefaults<S extends SettingsSectionId>(
  sectionId: S
): SchemaSection<S> {
  return collectSectionDefaults(sectionId);
}

/** Session default: tilt uses smooth, no-tilt uses smoothest (matches splash). */
export function getDefaultVoiceLeadingMode(
  tiltModeEnabled: boolean,
): VoiceLeadingMode {
  return tiltModeEnabled ? 'smooth' : 'smoothest';
}

function validateSection<S extends SettingsSectionId>(
  sectionId: S,
  rawSection: unknown
): SchemaSection<S> {
  const schema = USER_SETTINGS_SCHEMA[sectionId];
  const defaults = collectSectionDefaults(sectionId);
  if (!rawSection || typeof rawSection !== 'object') {
    return defaults;
  }
  const raw = rawSection as Record<string, unknown>;
  const result = { ...defaults };
  for (const key of Object.keys(schema)) {
    const def = schema[key];
    const value = raw[key];
    if (def.validate(value)) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export function validateLoadedSettings(raw: unknown): PersistedUserSettings {
  const source =
    raw && typeof raw === 'object'
      ? migrateLegacySettingsPayload(raw as Record<string, unknown>)
      : {};

  return {
    version: 1,
    general: validateSection('general', source.general),
    clockFace: validateSection('clockFace', source.clockFace),
    glowingOrbs: validateSection('glowingOrbs', source.glowingOrbs),
    voiceLeading: validateSection('voiceLeading', source.voiceLeading),
    voiceBorrowing: validateSection('voiceBorrowing', source.voiceBorrowing),
    soundDesign: validateSection('soundDesign', source.soundDesign),
  };
}

export function buildSettingsSnapshot(input: {
  general: GeneralSettings;
  clockFace: ClockFaceSettings;
  glowingOrbs: GlowingOrbsSettings;
  voiceLeading: VoiceLeadingSettings;
  voiceBorrowing: VoiceBorrowingSettings;
  soundDesign: SoundDesignSettings;
}): PersistedUserSettings {
  return {
    version: 1,
    general: { ...input.general },
    clockFace: { ...input.clockFace },
    glowingOrbs: { ...input.glowingOrbs },
    voiceLeading: { ...input.voiceLeading },
    voiceBorrowing: { ...input.voiceBorrowing },
    soundDesign: { ...input.soundDesign },
  };
}
