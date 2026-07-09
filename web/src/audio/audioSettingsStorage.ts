/**
 * localStorage persistence for Sound Design settings.
 */
import type { OutputProfileId } from './outputProfiles';
import { DEFAULT_OUTPUT_PROFILE_ID } from './outputProfiles';
import { DEFAULT_SYNTH_PRESET_ID } from './synthPresets';

export const OUTPUT_PROFILE_STORAGE_KEY = 'movemental-output-profile';
export const SYNTH_PRESET_STORAGE_KEY = 'movemental-synth-preset';

export function readOutputProfileId(): OutputProfileId {
  try {
    const value = localStorage.getItem(OUTPUT_PROFILE_STORAGE_KEY);
    if (value === 'smallSpeakers' || value === 'studio') {
      return value;
    }
  } catch {
    /* ignore quota / private mode */
  }
  return DEFAULT_OUTPUT_PROFILE_ID;
}

export function writeOutputProfileId(id: OutputProfileId): void {
  try {
    localStorage.setItem(OUTPUT_PROFILE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function readSynthPresetId(): string {
  try {
    const value = localStorage.getItem(SYNTH_PRESET_STORAGE_KEY);
    if (value) {
      return value;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SYNTH_PRESET_ID;
}

export function writeSynthPresetId(id: string): void {
  try {
    localStorage.setItem(SYNTH_PRESET_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
