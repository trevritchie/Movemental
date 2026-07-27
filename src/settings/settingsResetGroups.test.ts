import { describe, expect, it } from 'vitest';
import {
  getSettingsGroupDefaults,
  SETTINGS_RESET_GROUP_LABELS,
} from './settingsResetGroups';
import { DEFAULT_USER_SETTINGS } from './userSettingsSchema';

describe('settingsResetGroups', () => {
  it('defines labels for every reset group', () => {
    expect(SETTINGS_RESET_GROUP_LABELS.instrument).toBe('Instrument');
    expect(SETTINGS_RESET_GROUP_LABELS.tonalCenter).toBe('Tonal Center');
    expect(SETTINGS_RESET_GROUP_LABELS.playStyle).toBe('Sustain Mode');
    expect(SETTINGS_RESET_GROUP_LABELS.clockFace).toBe('Clock Face Diagram');
    expect(SETTINGS_RESET_GROUP_LABELS.glowingOrbs).toBe('Glowing Orbs');
    expect(SETTINGS_RESET_GROUP_LABELS.harmonicFunctionLabels).toBe(
      'Harmonic Function Labels',
    );
    expect(SETTINGS_RESET_GROUP_LABELS.diagramLayout).toBe('Layout');
    expect(SETTINGS_RESET_GROUP_LABELS.retriggerSoundingNotes).toBe(
      'Retrigger Sounding Notes',
    );
  });

  it('returns play style defaults only for playStyle group', () => {
    const defaults = getSettingsGroupDefaults('playStyle', {
      tiltModeEnabled: false,
      synthPresetId: 'warmPad',
    });

    expect(defaults).toEqual({
      playStyle: DEFAULT_USER_SETTINGS.general.playStyle,
    });
  });

  it('returns retrigger sounding notes default for its group', () => {
    const defaults = getSettingsGroupDefaults('retriggerSoundingNotes', {
      tiltModeEnabled: false,
      synthPresetId: 'warmPad',
    });

    expect(defaults).toEqual({
      retriggerSoundingNotes:
        DEFAULT_USER_SETTINGS.general.retriggerSoundingNotes,
    });
  });

  it('returns note and octave defaults for tonalCenter group', () => {
    const defaults = getSettingsGroupDefaults('tonalCenter', {
      tiltModeEnabled: false,
      synthPresetId: 'warmPad',
    });

    expect(defaults).toEqual({
      tonalCenter: DEFAULT_USER_SETTINGS.general.tonalCenter,
      octaveRange: DEFAULT_USER_SETTINGS.general.octaveRange,
    });
  });
});
