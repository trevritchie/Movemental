/**
 * Per-setting reset groups for the flattened settings menu UI.
 */
import {
  getPresetClickHoldEnvelope,
  getPresetDroneEnvelope,
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
  | 'tonalCenter'
  | 'voiceLeading'
  | 'voiceBorrowing'
  | 'clockFace'
  | 'glowingOrbs';

export const SETTINGS_RESET_GROUP_LABELS: Record<SettingsResetGroupId, string> =
  {
    instrument: 'Instrument',
    envelopeAdsr: 'Envelope (ADSR)',
    synthEffects: 'Synth Effects',
    eq: 'EQ',
    playStyle: 'Play Style',
    tonalCenter: 'Tonal Center',
    voiceLeading: 'Voice Leading',
    voiceBorrowing: 'Voice Borrowing',
    clockFace: 'Clock Face Diagram',
    glowingOrbs: 'Glowing Orbs',
  };

export function getPresetEnvelopeDefaults(synthPresetId: string): {
  envelopeAttack: number;
  envelopeDecay: number;
  envelopeSustain: number;
  envelopeRelease: number;
  droneAttack: number;
  droneDecay: number;
  droneSustain: number;
  droneRelease: number;
} {
  const preset = getSynthPreset(synthPresetId);
  const clickHold = getPresetClickHoldEnvelope(preset);
  const drone = getPresetDroneEnvelope(preset);
  return {
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
    default:
      return {};
  }
}
