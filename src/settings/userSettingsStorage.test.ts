import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_USER_SETTINGS } from './userSettingsSchema';
import {
  STORAGE_KEY,
  clearUserSettings,
  loadUserSettings,
  saveUserSettings,
} from './userSettingsStorage';

describe('userSettingsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when storage is empty', () => {
    const { settings, hasPersistedSettings, hasHarmonicFunctionLabelsSetting } =
      loadUserSettings();
    expect(hasPersistedSettings).toBe(false);
    expect(hasHarmonicFunctionLabelsSetting).toBe(false);
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('round-trips valid settings', () => {
    const custom = {
      ...DEFAULT_USER_SETTINGS,
      general: {
        tonalCenter: 3,
        octaveRange: 3,
        playStyle: 'tap_and_hold' as const,
        retriggerSoundingNotes: true,
      },
    };
    saveUserSettings(custom);

    const {
      settings,
      hasPersistedSettings,
      hasHarmonicFunctionLabelsSetting,
    } = loadUserSettings();
    expect(hasPersistedSettings).toBe(true);
    expect(hasHarmonicFunctionLabelsSetting).toBe(true);
    expect(settings.general).toEqual(custom.general);
  });

  it('falls back on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const { settings, hasPersistedSettings, hasHarmonicFunctionLabelsSetting } =
      loadUserSettings();
    expect(hasPersistedSettings).toBe(false);
    expect(hasHarmonicFunctionLabelsSetting).toBe(false);
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('recovers known fields from an unknown schema version', () => {
    // A stored blob with a future/mismatched version still counts as persisted
    // data. validateLoadedSettings recovers whatever fields it recognises and
    // falls back to defaults for unknown ones. hasPersistedSettings stays true
    // so the app does not reset the user's voice-leading mode preference.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 99, general: { tonalCenter: 1 } })
    );
    const {
      settings,
      hasPersistedSettings,
      hasHarmonicFunctionLabelsSetting,
    } = loadUserSettings();
    expect(hasPersistedSettings).toBe(true);
    expect(hasHarmonicFunctionLabelsSetting).toBe(false);
    expect(settings.general.tonalCenter).toBe(1);
  });

  it('clearUserSettings removes the key', () => {
    saveUserSettings(DEFAULT_USER_SETTINGS);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    clearUserSettings();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('treats valid legacy axisLabels as an existing harmonic-label setting', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, axisLabels: { enabled: true } }),
    );
    const { settings, hasHarmonicFunctionLabelsSetting } = loadUserSettings();
    expect(hasHarmonicFunctionLabelsSetting).toBe(true);
    expect(settings.harmonicFunctionLabels.enabled).toBe(true);
  });

  it('ignores invalid harmonicFunctionLabels so defaults can apply', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        harmonicFunctionLabels: { enabled: 'yes' },
      }),
    );
    const { settings, hasHarmonicFunctionLabelsSetting } = loadUserSettings();
    expect(hasHarmonicFunctionLabelsSetting).toBe(false);
    expect(settings.harmonicFunctionLabels.enabled).toBe(false);
  });

  it('ignores invalid legacy axisLabels values', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, axisLabels: {} }),
    );
    const { hasHarmonicFunctionLabelsSetting } = loadUserSettings();
    expect(hasHarmonicFunctionLabelsSetting).toBe(false);
  });
});
