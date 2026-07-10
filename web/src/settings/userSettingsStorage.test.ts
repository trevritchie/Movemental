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
    const { settings, hasPersistedSettings } = loadUserSettings();
    expect(hasPersistedSettings).toBe(false);
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('round-trips valid settings', () => {
    const custom = {
      ...DEFAULT_USER_SETTINGS,
      general: {
        tonalCenter: 3,
        octaveRange: 3,
        playStyle: 'click_and_hold' as const,
      },
    };
    saveUserSettings(custom);

    const { settings, hasPersistedSettings } = loadUserSettings();
    expect(hasPersistedSettings).toBe(true);
    expect(settings.general).toEqual(custom.general);
  });

  it('falls back on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const { settings, hasPersistedSettings } = loadUserSettings();
    expect(hasPersistedSettings).toBe(false);
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('rejects unknown schema version', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 99, general: { tonalCenter: 1 } })
    );
    const { hasPersistedSettings } = loadUserSettings();
    expect(hasPersistedSettings).toBe(false);
  });

  it('clearUserSettings removes the key', () => {
    saveUserSettings(DEFAULT_USER_SETTINGS);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    clearUserSettings();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
