import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import { DEFAULT_TONAL_CENTER_OFFSET } from './config';

describe('ChordManager', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
  });

  it('exposes elemental chords with coordinates', () => {
    const earth = manager.getChordByName('Earth');
    const coord = manager.getCoordinateForChord('Earth');

    expect(earth).toBeDefined();
    expect(earth!.name).toBe('Earth');
    expect(earth!.pitches).toHaveLength(4);
    expect(coord).toBeDefined();
    expect(coord!.x).toBeGreaterThan(0);
    expect(coord!.y).toBeGreaterThan(0);
  });

  it('resolves quadrant chords by name', () => {
    const trunk = manager.getChordByName('Trunk');
    expect(trunk).toBeDefined();
    expect(trunk!.traditionalName).toMatch(/min6/);
  });

  it('finds the nearest chord at diagram coordinates', () => {
    const coord = manager.getCoordinateForChord('Wind');
    expect(coord).toBeDefined();

    const chord = manager.getChordByCoordinates(coord!.x, coord!.y);
    expect(chord?.name).toBe('Wind');
  });

  describe('applyVoicing', () => {
    const basePitches: (number | null)[] = [10, 13, 17, 19];

    it('applies Close voicing with octave offset only', () => {
      manager.setVoicing('Close');
      const voiced = manager.applyVoicing(basePitches);
      expect(voiced).toEqual([46, 49, 53, 55]);
    });

    it('drops the second voice for Drop 2', () => {
      manager.setVoicing('Drop 2');
      const voiced = manager.applyVoicing(basePitches);
      expect(voiced[1]).toBe(49 + 12);
    });

    it('drops second and fourth voices for Drop 2 & 4', () => {
      manager.setVoicing('Drop 2 & 4');
      const voiced = manager.applyVoicing(basePitches);
      expect(voiced[1]).toBe(49 + 12);
      expect(voiced[3]).toBe(55 + 12);
    });
  });

  it('rebuilds chords when tonal center changes', () => {
    manager.setTonalCenterOffset(DEFAULT_TONAL_CENTER_OFFSET);
    const before = manager.getChordByName('Earth')!.pitches;

    manager.setTonalCenterOffset(0);
    const after = manager.getChordByName('Earth')!.pitches;

    expect(after).not.toEqual(before);
  });
});
