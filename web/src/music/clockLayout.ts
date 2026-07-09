/**
 * Clockface slot geometry and pitch-class-to-slot mapping for chromatic and
 * circle-of-fifths layouts.
 */
import type { ClockLayoutMode } from '../context/types';
import { NOTE_NAMES_FLAT } from './config';

/** Relative pitch classes in clockwise fifths order from tonal center. */
export const FIFTHS_CYCLE: readonly number[] = Array.from({ length: 12 }, (_, i) =>
  (i * 7) % 12
);

export function relativePcToClockSlot(
  rpc: number,
  mode: ClockLayoutMode
): number {
  const normalized = ((rpc % 12) + 12) % 12;
  if (mode === 'chromatic') return normalized;
  return (normalized * 7) % 12;
}

export function clockSlotToRelativePc(
  slot: number,
  mode: ClockLayoutMode
): number {
  const normalized = ((slot % 12) + 12) % 12;
  if (mode === 'chromatic') return normalized;
  return (normalized * 7) % 12;
}

export function clockSlotToAngle(slot: number): number {
  const normalized = ((slot % 12) + 12) % 12;
  return (normalized / 12) * Math.PI * 2 - Math.PI / 2;
}

export function clockSlotToCoordinates(
  slot: number,
  cx: number,
  cy: number,
  radius: number,
  labelOffset = 22
): { x: number; y: number; labelX: number; labelY: number } {
  const angle = clockSlotToAngle(slot);
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
    labelX: cx + (radius + labelOffset) * Math.cos(angle),
    labelY: cy + (radius + labelOffset) * Math.sin(angle),
  };
}

export function clockSlotToNoteName(
  slot: number,
  tonalCenter: number,
  mode: ClockLayoutMode
): string {
  const relPc = clockSlotToRelativePc(slot, mode);
  const notePc = (tonalCenter + relPc) % 12;
  return NOTE_NAMES_FLAT[notePc];
}
