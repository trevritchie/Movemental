/**
 * Per-setting reset groups for the flattened settings menu UI.
 */
import {
  getPresetTapAndHoldEnvelope,
  getPresetTapEnvelope,
  getPresetFxDefaults,
  getSynthPreset,
  isSamplerPreset,
} from '../audio/synthPresets';
import {
  DEFAULT_USER_SETTINGS,
  getDefaultVoiceLeadingMode,
  type SettingKey,
} from './userSettingsSchema';

export type SettingsResetGroupId =
  | 'instrument'
  | 'envelopeAdsr'
  | 'synthEffects'
  | 'eq'
  | 'playStyle'
  | 'retriggerSoundingNotes'
  | 'tonalCenter'
  | 'voiceLeading'
  | 'voiceBorrowing'
  | 'clockFace'
  | 'glowingOrbs'
  | 'harmonicFunctionLabels'
  | 'diagramLayout';

export const SETTINGS_RESET_GROUP_LABELS: Record<SettingsResetGroupId, string> =
  {
    instrument: 'Instrument',
    envelopeAdsr: 'Envelope (ADSR)',
    synthEffects: 'Synth Effects',
    eq: 'EQ',
    playStyle: 'Sustain Mode',
    retriggerSoundingNotes: 'Retrigger Sounding Notes',
    tonalCenter: 'Tonal Center',
    voiceLeading: 'Voice Leading',
    voiceBorrowing: 'Voice Borrowing',
    clockFace: 'Clock Face Diagram',
    glowingOrbs: 'Glowing Orbs',
    harmonicFunctionLabels: 'Harmonic Function Labels',
    diagramLayout: 'Layout',
  };

export function getPresetEnvelopeDefaults(synthPresetId: string): {
  envelopeAttack: number;
  envelopeDecay: number;
  envelopeSustain: number;
  envelopeRelease: number;
  tapAttack: number;
  tapDecay: number;
  tapSustain: number;
  tapRelease: number;
} {
  const preset = getSynthPreset(synthPresetId);
  const tapAndHold = getPresetTapAndHoldEnvelope(preset);
  const tap = getPresetTapEnvelope(preset);
  return {
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

export function getPresetFxDefaultsForId(synthPresetId: string): {
  chorusWet: number;
  delayWet: number;
  reverbWet: number;
} {
  const preset = getSynthPreset(synthPresetId);
  if (isSamplerPreset(preset)) {
    return { chorusWet: 0, delayWet: 0, reverbWet: 0 };
  }
  return getPresetFxDefaults(preset);
}

export function getSettingsGroupDefaults(
  groupId: SettingsResetGroupId,
  options: { tiltModeEnabled: boolean; synthPresetId: string },
): Partial<Record<SettingKey, unknown>> {
  const defaults = DEFAULT_USER_SETTINGS;

  switch (groupId) {
    case 'playStyle':
      return { playStyle: defaults.general.playStyle };
    case 'retriggerSoundingNotes':
      return {
        retriggerSoundingNotes: defaults.general.retriggerSoundingNotes,
      };
    case 'tonalCenter':
      return {
        tonalCenter: defaults.general.tonalCenter,
        octaveRange: defaults.general.octaveRange,
      };
    case 'instrument':
      return { synthPresetId: defaults.soundDesign.synthPresetId };
    case 'eq':
      return { eqProfileId: defaults.soundDesign.eqProfileId };
    case 'envelopeAdsr':
      return getPresetEnvelopeDefaults(options.synthPresetId);
    case 'synthEffects':
      return getPresetFxDefaultsForId(options.synthPresetId);
    case 'voiceLeading':
      return {
        mode: getDefaultVoiceLeadingMode(options.tiltModeEnabled),
      };
    case 'voiceBorrowing':
      return { memory: defaults.voiceBorrowing.memory };
    case 'clockFace':
      return { layoutMode: defaults.clockFace.layoutMode };
    case 'glowingOrbs':
      return { enabled: defaults.glowingOrbs.enabled };
    case 'harmonicFunctionLabels':
      // Applied via setHarmonicFunctionLabelsEnabled in useSettingsReset
      // (shares SettingKey "enabled" with glowingOrbs).
      return {};
    case 'diagramLayout':
      return { diagramMode: defaults.diagramLayout.diagramMode };
    default:
      return {};
  }
}
