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
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        settings: DEFAULT_USER_SETTINGS,
        hasPersistedSettings: false,
      };
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      (parsed as { version?: unknown }).version !== SCHEMA_VERSION
    ) {
      return {
        settings: validateLoadedSettings(parsed),
        hasPersistedSettings: false,
      };
    }
    return {
      settings: validateLoadedSettings(parsed),
      hasPersistedSettings: true,
    };
  } catch {
    return {
      settings: DEFAULT_USER_SETTINGS,
      hasPersistedSettings: false,
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
