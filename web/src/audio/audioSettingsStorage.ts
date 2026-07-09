/**
 * Sound Design settings defaults (session-only; no localStorage persistence).
 */
import type { LayoutTier } from '../layout/breakpoints';
import { resolveDefaultEqProfileId, type EqProfileId } from './outputProfiles';
import { DEFAULT_SYNTH_PRESET_ID } from './synthPresets';

export function readEqProfileId(tier?: LayoutTier): EqProfileId {
  return resolveDefaultEqProfileId(tier);
}

/** @deprecated Use readEqProfileId */
export const readOutputProfileId = readEqProfileId;

export function writeEqProfileId(_id: EqProfileId): void {
  /* session-only */
}

/** @deprecated Use writeEqProfileId */
export const writeOutputProfileId = writeEqProfileId;

export function readSynthPresetId(): string {
  return DEFAULT_SYNTH_PRESET_ID;
}

export function writeSynthPresetId(_id: string): void {
  /* session-only */
}
