/**
 * localStorage persistence for Sound Design settings.
 */
import type { LayoutTier } from '../layout/breakpoints';
import {
  normalizeEqProfileId,
  resolveDefaultEqProfileId,
  type EqProfileId,
} from './outputProfiles';
import { DEFAULT_SYNTH_PRESET_ID } from './synthPresets';

export const OUTPUT_PROFILE_STORAGE_KEY = 'movemental-output-profile';
export const SYNTH_PRESET_STORAGE_KEY = 'movemental-synth-preset';

export function readEqProfileId(tier?: LayoutTier): EqProfileId {
  try {
    const value = localStorage.getItem(OUTPUT_PROFILE_STORAGE_KEY);
    if (value) {
      const normalized = normalizeEqProfileId(value);
      if (normalized) {
        if (normalized !== value) {
          localStorage.setItem(OUTPUT_PROFILE_STORAGE_KEY, normalized);
        }
        return normalized;
      }
    }
  } catch {
    /* ignore quota / private mode */
  }
  return resolveDefaultEqProfileId(tier);
}

/** @deprecated Use readEqProfileId */
export const readOutputProfileId = readEqProfileId;

export function writeEqProfileId(id: EqProfileId): void {
  try {
    localStorage.setItem(OUTPUT_PROFILE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** @deprecated Use writeEqProfileId */
export const writeOutputProfileId = writeEqProfileId;

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
