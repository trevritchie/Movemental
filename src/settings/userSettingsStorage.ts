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

function sectionHasBooleanEnabled(section: unknown): boolean {
  return (
    section !== null &&
    typeof section === 'object' &&
    typeof (section as Record<string, unknown>).enabled === 'boolean'
  );
}

/**
 * True only when a valid boolean `enabled` was stored under the current or
 * legacy key. Invalid values should fall through to the responsive default.
 */
export function hasValidHarmonicFunctionLabelsSetting(
  parsed: unknown,
): boolean {
  if (parsed === null || typeof parsed !== 'object') {
    return false;
  }
  const source = parsed as Record<string, unknown>;
  if ('harmonicFunctionLabels' in source) {
    return sectionHasBooleanEnabled(source.harmonicFunctionLabels);
  }
  if ('axisLabels' in source) {
    return sectionHasBooleanEnabled(source.axisLabels);
  }
  return false;
}

export function loadUserSettings(): {
  settings: PersistedUserSettings;
  hasPersistedSettings: boolean;
  /** True when stored JSON already had a valid boolean enabled value. */
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
    // Recover whatever fields are present regardless of version mismatch.
    // hasPersistedSettings is true as long as any stored data exists; a version
    // difference means the schema evolved, not that the user is new.
    return {
      settings: validateLoadedSettings(parsed),
      hasPersistedSettings: true,
      hasHarmonicFunctionLabelsSetting:
        hasValidHarmonicFunctionLabelsSetting(parsed),
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
