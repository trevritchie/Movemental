import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USER_SETTINGS,
  getDefaultSoundDesignSettings,
  getSectionDefaults,
  validateLoadedSettings,
} from './userSettingsSchema';
import { DEFAULT_SYNTH_PRESET_ID } from '../audio/synthPresets';

describe('userSettingsSchema', () => {
  it('derives DEFAULT_USER_SETTINGS from schema defaults', () => {
    expect(DEFAULT_USER_SETTINGS.general.tonalCenter).toBe(10);
    expect(DEFAULT_USER_SETTINGS.general.octaveRange).toBe(2);
    expect(DEFAULT_USER_SETTINGS.general.playStyle).toBe('drone');
    expect(DEFAULT_USER_SETTINGS.voiceLeading.mode).toBe('smooth');
    expect(DEFAULT_USER_SETTINGS.voiceBorrowing.memory).toBe('per-chord');
    expect(DEFAULT_USER_SETTINGS.soundDesign.synthPresetId).toBe(
      DEFAULT_SYNTH_PRESET_ID
    );
    expect(DEFAULT_USER_SETTINGS.soundDesign.eqProfileId).toBe('smallSpeakers');
  });

  it('getDefaultSoundDesignSettings matches default preset values', () => {
    const defaults = getDefaultSoundDesignSettings();
    expect(defaults.synthPresetId).toBe(DEFAULT_SYNTH_PRESET_ID);
    expect(defaults.chorusWet).toBeGreaterThanOrEqual(0);
    expect(defaults.chorusWet).toBeLessThanOrEqual(1);
  });

  it('getSectionDefaults returns a slice for one section', () => {
    expect(getSectionDefaults('general')).toEqual({
      tonalCenter: 10,
      octaveRange: 2,
      playStyle: 'drone',
    });
    expect(getSectionDefaults('soundDesign').delayWet).toBe(0);
  });

  it('validateLoadedSettings falls back per-field on invalid values', () => {
    const result = validateLoadedSettings({
      general: {
        tonalCenter: 99,
        octaveRange: 2,
        playStyle: 'invalid',
      },
      voiceLeading: { mode: 'not-a-mode' },
      voiceBorrowing: { memory: 'shared' },
      soundDesign: {
        chorusWet: 2,
        delayWet: -1,
        reverbWet: 0.3,
        envelopeAttack: 0.15,
        envelopeDecay: 2,
        envelopeSustain: 0.5,
        envelopeRelease: 2.5,
        droneAttack: 0.6,
        droneDecay: 3.5,
        droneSustain: 0.2,
        droneRelease: 0.5,
      },
    });

    expect(result.general.tonalCenter).toBe(10);
    expect(result.general.playStyle).toBe('drone');
    expect(result.voiceLeading.mode).toBe('smooth');
    expect(result.voiceBorrowing.memory).toBe('per-chord');
    expect(result.soundDesign.synthPresetId).toBe(DEFAULT_SYNTH_PRESET_ID);
    expect(result.soundDesign.eqProfileId).toBe('smallSpeakers');
    expect(result.soundDesign.chorusWet).toBeGreaterThanOrEqual(0);
    expect(result.soundDesign.delayWet).toBe(0);
  });

  it('validateLoadedSettings accepts valid instrument and eq overrides', () => {
    const result = validateLoadedSettings({
      soundDesign: {
        synthPresetId: 'warmPad',
        eqProfileId: 'flat',
      },
    });

    expect(result.soundDesign.synthPresetId).toBe('warmPad');
    expect(result.soundDesign.eqProfileId).toBe('flat');
  });

  it('validateLoadedSettings accepts valid partial overrides', () => {
    const result = validateLoadedSettings({
      general: { tonalCenter: 0, octaveRange: 4, playStyle: 'click_and_hold' },
      voiceLeading: { mode: 'root_position' },
      voiceBorrowing: { memory: 'global' },
      soundDesign: { chorusWet: 0.5 },
    });

    expect(result.general).toEqual({
      tonalCenter: 0,
      octaveRange: 4,
      playStyle: 'click_and_hold',
    });
    expect(result.voiceLeading.mode).toBe('root_position');
    expect(result.voiceBorrowing.memory).toBe('global');
    expect(result.soundDesign.chorusWet).toBe(0.5);
    expect(result.soundDesign.reverbWet).toBe(
      DEFAULT_USER_SETTINGS.soundDesign.reverbWet
    );
  });
});
