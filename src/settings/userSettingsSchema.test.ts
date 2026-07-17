import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USER_SETTINGS,
  getDefaultHarmonicFunctionLabelsEnabled,
  getDefaultSoundDesignSettings,
  getDefaultVoiceLeadingMode,
  getSectionDefaults,
  validateLoadedSettings,
} from './userSettingsSchema';
import { DEFAULT_SYNTH_PRESET_ID } from '../audio/synthPresets';

describe('userSettingsSchema', () => {
  it('derives DEFAULT_USER_SETTINGS from schema defaults', () => {
    expect(DEFAULT_USER_SETTINGS.general.tonalCenter).toBe(10);
    expect(DEFAULT_USER_SETTINGS.general.octaveRange).toBe(2);
    expect(DEFAULT_USER_SETTINGS.general.playStyle).toBe('tap');
    expect(DEFAULT_USER_SETTINGS.general.retriggerSoundingNotes).toBe(false);
    expect(DEFAULT_USER_SETTINGS.voiceLeading.mode).toBe('smooth');
    expect(DEFAULT_USER_SETTINGS.clockFace.layoutMode).toBe('chromatic');
    expect(DEFAULT_USER_SETTINGS.glowingOrbs.enabled).toBe(true);
    expect(DEFAULT_USER_SETTINGS.harmonicFunctionLabels.enabled).toBe(false);
    expect(DEFAULT_USER_SETTINGS.diagramLayout.diagramMode).toBe(
      'complete_geometry',
    );
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
      playStyle: 'tap',
      retriggerSoundingNotes: false,
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
        tapAttack: 0.6,
        tapDecay: 3.5,
        tapSustain: 0.2,
        tapRelease: 0.5,
      },
    });

    expect(result.general.tonalCenter).toBe(10);
    expect(result.general.playStyle).toBe('tap');
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

  it('getDefaultVoiceLeadingMode follows session tilt mode', () => {
    expect(getDefaultVoiceLeadingMode(true)).toBe('smooth');
    expect(getDefaultVoiceLeadingMode(false)).toBe('smoothest');
  });

  it('getDefaultHarmonicFunctionLabelsEnabled follows chord-name labels', () => {
    expect(getDefaultHarmonicFunctionLabelsEnabled(true)).toBe(true);
    expect(getDefaultHarmonicFunctionLabelsEnabled(false)).toBe(false);
  });

  it('validateLoadedSettings accepts valid partial overrides', () => {
    const result = validateLoadedSettings({
      general: { tonalCenter: 0, octaveRange: 4, playStyle: 'tap_and_hold' },
      voiceLeading: { mode: 'root_position' },
      voiceBorrowing: { memory: 'global' },
      soundDesign: { chorusWet: 0.5 },
    });

    expect(result.general).toEqual({
      tonalCenter: 0,
      octaveRange: 4,
      playStyle: 'tap_and_hold',
      retriggerSoundingNotes: false,
    });
    expect(result.voiceLeading.mode).toBe('root_position');
    expect(result.voiceBorrowing.memory).toBe('global');
    expect(result.soundDesign.chorusWet).toBe(0.5);
    expect(result.soundDesign.reverbWet).toBe(
      DEFAULT_USER_SETTINGS.soundDesign.reverbWet
    );
  });

  it('migrates legacy drone and click_and_hold play styles and envelope keys', () => {
    const result = validateLoadedSettings({
      general: { playStyle: 'drone' },
      soundDesign: {
        droneAttack: 0.9,
        droneDecay: 1.1,
        droneSustain: 0.3,
        droneRelease: 0.4,
      },
    });

    expect(result.general.playStyle).toBe('tap');
    expect(result.soundDesign.tapAttack).toBe(0.9);
    expect(result.soundDesign.tapDecay).toBe(1.1);
    expect(result.soundDesign.tapSustain).toBe(0.3);
    expect(result.soundDesign.tapRelease).toBe(0.4);

    const holdResult = validateLoadedSettings({
      general: { playStyle: 'click_and_hold' },
    });
    expect(holdResult.general.playStyle).toBe('tap_and_hold');
  });

  it('validateLoadedSettings defaults and accepts harmonicFunctionLabels.enabled', () => {
    expect(validateLoadedSettings({}).harmonicFunctionLabels.enabled).toBe(
      false,
    );
    expect(
      validateLoadedSettings({
        harmonicFunctionLabels: { enabled: true },
      }).harmonicFunctionLabels.enabled,
    ).toBe(true);
    expect(
      validateLoadedSettings({
        harmonicFunctionLabels: { enabled: 'yes' },
      }).harmonicFunctionLabels.enabled,
    ).toBe(false);
  });

  it('migrates legacy axisLabels into harmonicFunctionLabels', () => {
    const result = validateLoadedSettings({
      axisLabels: { enabled: false },
    });
    expect(result.harmonicFunctionLabels.enabled).toBe(false);
  });

  it('validateLoadedSettings defaults and accepts diagramLayout.diagramMode', () => {
    expect(validateLoadedSettings({}).diagramLayout.diagramMode).toBe(
      'complete_geometry',
    );
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'major' },
      }).diagramLayout.diagramMode,
    ).toBe('major');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'natural_minor' },
      }).diagramLayout.diagramMode,
    ).toBe('natural_minor');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'minor' },
      }).diagramLayout.diagramMode,
    ).toBe('minor');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'blues' },
      }).diagramLayout.diagramMode,
    ).toBe('blues');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'jazz_blues' },
      }).diagramLayout.diagramMode,
    ).toBe('jazz_blues');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'rhythm_changes' },
      }).diagramLayout.diagramMode,
    ).toBe('rhythm_changes');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'major_sixth_diminished' },
      }).diagramLayout.diagramMode,
    ).toBe('major_sixth_diminished');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'minor_sixth_diminished' },
      }).diagramLayout.diagramMode,
    ).toBe('minor_sixth_diminished');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'dominant_seventh_diminished' },
      }).diagramLayout.diagramMode,
    ).toBe('dominant_seventh_diminished');
    expect(
      validateLoadedSettings({
        diagramLayout: {
          diagramMode: 'dominant_seventh_flat_five_diminished',
        },
      }).diagramLayout.diagramMode,
    ).toBe('dominant_seventh_flat_five_diminished');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'composite_minor' },
      }).diagramLayout.diagramMode,
    ).toBe('minor');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'harmonic_melodic_minor' },
      }).diagramLayout.diagramMode,
    ).toBe('minor_sixth_diminished');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'harmonic_minor' },
      }).diagramLayout.diagramMode,
    ).toBe('minor_sixth_diminished');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'melodic_minor' },
      }).diagramLayout.diagramMode,
    ).toBe('minor_sixth_diminished');
    expect(
      validateLoadedSettings({
        diagramLayout: { diagramMode: 'dorian' },
      }).diagramLayout.diagramMode,
    ).toBe('complete_geometry');
  });
});



