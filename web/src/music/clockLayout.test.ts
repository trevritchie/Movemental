import { describe, it, expect } from 'vitest';
import {
  FIFTHS_CYCLE,
  clockSlotToNoteName,
  clockSlotToRelativePc,
  relativePcToClockSlot,
} from './clockLayout';

describe('FIFTHS_CYCLE', () => {
  it('lists relative pitch classes in clockwise fifths order', () => {
    expect([...FIFTHS_CYCLE]).toEqual([0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]);
  });
});

describe('relativePcToClockSlot / clockSlotToRelativePc', () => {
  it('maps slot 0 to RPC 0 in both modes', () => {
    expect(clockSlotToRelativePc(0, 'chromatic')).toBe(0);
    expect(clockSlotToRelativePc(0, 'circle_of_fifths')).toBe(0);
    expect(relativePcToClockSlot(0, 'chromatic')).toBe(0);
    expect(relativePcToClockSlot(0, 'circle_of_fifths')).toBe(0);
  });

  it('round-trips all 12 values in chromatic mode', () => {
    for (let i = 0; i < 12; i++) {
      expect(relativePcToClockSlot(i, 'chromatic')).toBe(i);
      expect(clockSlotToRelativePc(i, 'chromatic')).toBe(i);
    }
  });

  it('round-trips all 12 values in circle-of-fifths mode', () => {
    for (let i = 0; i < 12; i++) {
      const slot = relativePcToClockSlot(i, 'circle_of_fifths');
      expect(clockSlotToRelativePc(slot, 'circle_of_fifths')).toBe(i);
    }
  });

  it('places a perfect fifth at slot 1 in circle-of-fifths mode', () => {
    expect(relativePcToClockSlot(7, 'circle_of_fifths')).toBe(1);
  });

  it('maps Branch RPCs to distinct fifths slots at Bb center', () => {
    const rpcs = [0, 4, 7, 11];
    const slots = rpcs.map((rpc) => relativePcToClockSlot(rpc, 'circle_of_fifths'));
    expect(new Set(slots).size).toBe(4);
    expect(slots).toEqual([0, 4, 1, 5]);
  });
});

describe('clockSlotToNoteName', () => {
  const tonalCenter = 10; // Bb

  it('returns chromatic labels matching current clock order', () => {
    const labels = Array.from({ length: 12 }, (_, slot) =>
      clockSlotToNoteName(slot, tonalCenter, 'chromatic')
    );
    expect(labels).toEqual([
      'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A',
    ]);
  });

  it('returns fifths-order labels in circle-of-fifths mode', () => {
    const labels = Array.from({ length: 12 }, (_, slot) =>
      clockSlotToNoteName(slot, tonalCenter, 'circle_of_fifths')
    );
    expect(labels.slice(0, 6)).toEqual(['Bb', 'F', 'C', 'G', 'D', 'A']);
  });
});
