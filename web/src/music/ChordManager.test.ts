import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import { DEFAULT_TONAL_CENTER_OFFSET, NOTE_NAMES_FLAT } from './config';

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

  describe('elemental diminished roots', () => {
    const cases = [
      {
        tonalCenter: 0,
        earth: 6,
        wind: 4,
        fire: 11,
      },
      {
        tonalCenter: 2,
        earth: 8,
        wind: 6,
        fire: 1,
      },
      {
        tonalCenter: 10,
        earth: 4,
        wind: 2,
        fire: 9,
      },
    ];

    for (const { tonalCenter, earth, wind, fire } of cases) {
      it(`maps Earth/Wind/Fire to contrary-motion dim7 roots at tonal center ${tonalCenter}`, () => {
        manager.setTonalCenterOffset(tonalCenter);

        const earthChord = manager.getChordByName('Earth')!;
        const windChord = manager.getChordByName('Wind')!;
        const fireChord = manager.getChordByName('Fire')!;

        const earthRoot =
          earthChord.pitches[earthChord.rootPositionIndex] % 12;
        const windRoot = windChord.pitches[windChord.rootPositionIndex] % 12;
        const fireRoot = fireChord.pitches[fireChord.rootPositionIndex] % 12;

        expect(earthRoot).toBe(earth);
        expect(windRoot).toBe(wind);
        expect(fireRoot).toBe(fire);

        expect(earthChord.traditionalName).toBe(
          `${NOTE_NAMES_FLAT[earthRoot]} dim7`
        );
        expect(windChord.traditionalName).toBe(
          `${NOTE_NAMES_FLAT[windRoot]} dim7`
        );
        expect(fireChord.traditionalName).toBe(
          `${NOTE_NAMES_FLAT[fireRoot]} dim7`
        );

        for (const chord of [earthChord, windChord, fireChord]) {
          expect(chord.pitches.every(p => p >= 0 && p < 12)).toBe(true);
        }
      });
    }
  });
});
