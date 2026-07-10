/**
 * Single source of truth for persisted user settings: defaults, validation,
 * section grouping, and derived types for load/save/reset.
 */
import {
  DEFAULT_TONAL_CENTER_OFFSET,
  DEFAULT_OCTAVE_RANGE,
  DEFAULT_VOICE_LEADING_MODE,
  MAX_OCTAVE_RANGE,
  MIN_OCTAVE_RANGE,
} from '../music/config';
import type { PlayStyle, VoiceLeadingMode } from '../context/types';
import {
  DEFAULT_OUTPUT_PROFILE_ID,
  isEqProfileId,
  type EqProfileId,
} from '../audio/outputProfiles';
import {
  DEFAULT_SYNTH_PRESET_ID,
  getPresetClickHoldEnvelope,
  getPresetDroneEnvelope,
  getPresetFxDefaults,
  getSynthPreset,
  isSamplerPreset,
  SYNTH_PRESETS,
} from '../audio/synthPresets';

export type SettingsSectionId =
  | 'general'
  | 'voiceLeading'
  | 'voiceBorrowing'
  | 'soundDesign';

export const SETTINGS_SECTION_IDS: readonly SettingsSectionId[] = [
  'general',
  'voiceLeading',
  'voiceBorrowing',
  'soundDesign',
] as const;

export const SETTINGS_SECTION_LABELS: Record<SettingsSectionId, string> = {
  general: 'General',
  voiceLeading: 'Voice Leading',
  voiceBorrowing: 'Voice Borrowing',
  soundDesign: 'Sound Design',
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
  return value === 'click_and_hold' || value === 'drone';
}

function isVoiceLeadingMode(value: unknown): value is VoiceLeadingMode {
  return (
    value === 'root_position' || value === 'smooth' || value === 'smoothest'
  );
}

function isBorrowingMemory(value: unknown): value is BorrowingMemoryMode {
  return value === 'global' || value === 'per-chord';
}

function isWet(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
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
  const clickHold = getPresetClickHoldEnvelope(preset);
  const drone = getPresetDroneEnvelope(preset);

  return {
    synthPresetId: DEFAULT_SYNTH_PRESET_ID,
    eqProfileId: DEFAULT_OUTPUT_PROFILE_ID,
    chorusWet: fx.chorusWet,
    delayWet: fx.delayWet,
    reverbWet: fx.reverbWet,
    envelopeAttack: clickHold.attack,
    envelopeDecay: clickHold.decay,
    envelopeSustain: clickHold.sustain,
    envelopeRelease: clickHold.release,
    droneAttack: drone.attack,
    droneDecay: drone.decay,
    droneSustain: drone.sustain,
    droneRelease: drone.release,
  };
}

const DEFAULT_SOUND_DESIGN = getDefaultSoundDesignSettings();

export type GeneralSettings = {
  tonalCenter: number;
  octaveRange: number;
  playStyle: PlayStyle;
};

export type VoiceLeadingSettings = {
  mode: VoiceLeadingMode;
};

export type VoiceBorrowingSettings = {
  memory: BorrowingMemoryMode;
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
  droneAttack: number;
  droneDecay: number;
  droneSustain: number;
  droneRelease: number;
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
      default: 'drone' as PlayStyle,
      validate: isPlayStyle,
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
    droneAttack: {
      default: DEFAULT_SOUND_DESIGN.droneAttack,
      validate: isPositiveNumber,
    },
    droneDecay: {
      default: DEFAULT_SOUND_DESIGN.droneDecay,
      validate: isPositiveNumber,
    },
    droneSustain: {
      default: DEFAULT_SOUND_DESIGN.droneSustain,
      validate: isWet,
    },
    droneRelease: {
      default: DEFAULT_SOUND_DESIGN.droneRelease,
      validate: isPositiveNumber,
    },
  },
};

type SchemaSection<S extends SettingsSectionId> = S extends 'general'
  ? GeneralSettings
  : S extends 'voiceLeading'
    ? VoiceLeadingSettings
    : S extends 'voiceBorrowing'
      ? VoiceBorrowingSettings
      : SoundDesignSettings;

export type PersistedUserSettings = {
  version: 1;
  general: GeneralSettings;
  voiceLeading: VoiceLeadingSettings;
  voiceBorrowing: VoiceBorrowingSettings;
  soundDesign: SoundDesignSettings;
};

export type SettingKey =
  | keyof GeneralSettings
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
      ? (raw as Record<string, unknown>)
      : {};

  return {
    version: 1,
    general: validateSection('general', source.general),
    voiceLeading: validateSection('voiceLeading', source.voiceLeading),
    voiceBorrowing: validateSection('voiceBorrowing', source.voiceBorrowing),
    soundDesign: validateSection('soundDesign', source.soundDesign),
  };
}

export function buildSettingsSnapshot(input: {
  general: GeneralSettings;
  voiceLeading: VoiceLeadingSettings;
  voiceBorrowing: VoiceBorrowingSettings;
  soundDesign: SoundDesignSettings;
}): PersistedUserSettings {
  return {
    version: 1,
    general: { ...input.general },
    voiceLeading: { ...input.voiceLeading },
    voiceBorrowing: { ...input.voiceBorrowing },
    soundDesign: { ...input.soundDesign },
  };
}
