/**
 * localStorage persistence for user settings (versioned JSON blob).
 */
import {
  DEFAULT_USER_SETTINGS,
  validateLoadedSettings,
  type PersistedUserSettings,
} from './userSettingsSchema';

export const STORAGE_KEY = 'movemental-user-settings';
export const SCHEMA_VERSION = 1;

export function loadUserSettings(): {
  settings: PersistedUserSettings;
  hasPersistedSettings: boolean;
  /** True when stored JSON already had this section (or legacy axisLabels). */
  hasHarmonicFunctionLabelsSetting: boolean;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        settings: DEFAULT_USER_SETTINGS,
        hasPersistedSettings: false,
        hasHarmonicFunctionLabelsSetting: false,
      };
    }
    const parsed: unknown = JSON.parse(raw);
    const hadHarmonicFunctionLabelsSetting =
      parsed !== null &&
      typeof parsed === 'object' &&
      ('harmonicFunctionLabels' in parsed || 'axisLabels' in parsed);
    // Recover whatever fields are present regardless of version mismatch.
    // hasPersistedSettings is true as long as any stored data exists; a version
    // difference means the schema evolved, not that the user is new.
    return {
      settings: validateLoadedSettings(parsed),
      hasPersistedSettings: true,
      hasHarmonicFunctionLabelsSetting: hadHarmonicFunctionLabelsSetting,
    };
  } catch {
    return {
      settings: DEFAULT_USER_SETTINGS,
      hasPersistedSettings: false,
      hasHarmonicFunctionLabelsSetting: false,
    };
  }
}

export function saveUserSettings(settings: PersistedUserSettings): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...settings, version: SCHEMA_VERSION })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearUserSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
