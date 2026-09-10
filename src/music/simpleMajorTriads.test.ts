import { beforeEach, describe, expect, it } from 'vitest';
import {
  getInitialBorrowingState,
  getMutedPitchClasses,
} from './BorrowingLogic';
import { chordManager } from './ChordManager';
import { DEFAULT_TONAL_CENTER_OFFSET } from './config';
import { MAJOR_LAYOUT_CHORDS } from './diagramLayouts';
import { normalizePitchClass, relativePitchClass } from './pitchClass';
import {
  applySimpleTriadMutes,
  formatSimpleTriadCaption,
  relativeChordPitchClasses,
  resolveAllSimpleMajorTriads,
  resolveSimpleMajorTriad,
  SIMPLE_MAJOR_TRIAD_DEFS,
} from './simpleMajorTriads';

const EXPECTED_SOURCE: Record<string, string> = {
  I: 'Branch',
  vi: 'Branch',
  ii: 'Magma',
  IV: 'Glass',
  vii_dim: 'Magma',
  iii: 'Ember',
  V: 'Ember',
};

function uniquePcs(values: readonly number[]): number[] {
  return [...new Set(values.map((value) => normalizePitchClass(value)))].sort(
    (a, b) => a - b,
  );
}

describe('simpleMajorTriads', () => {
  beforeEach(() => {
    chordManager.configureTonalSpace(0, chordManager.getOctaveRange());
  });

  it('matches live chord.pitches (mod-12 PCs after tonal-center transpose)', () => {
    const branch = chordManager.getChordByName('Branch');
    expect(branch).toBeDefined();
    expect(uniquePcs(branch!.originalPitches)).toEqual([0, 4, 7, 9]);
    expect(uniquePcs(branch!.pitches)).toEqual([0, 4, 7, 9]);
    expect(relativeChordPitchClasses(branch!, 0).sort((a, b) => a - b)).toEqual([
      0, 4, 7, 9,
    ]);

    chordManager.configureTonalSpace(DEFAULT_TONAL_CENTER_OFFSET, 2);
    const branchAtBb = chordManager.getChordByName('Branch')!;
    expect(uniquePcs(branchAtBb.pitches)).toEqual([2, 5, 7, 10]);
    expect(
      branchAtBb.pitches.every(
        (pc) => relativePitchClass(pc, DEFAULT_TONAL_CENTER_OFFSET) <= 11,
      ),
    ).toBe(true);
  });

  it('derives the Major RN mapping on every tonal center', () => {
    for (let center = 0; center < 12; center += 1) {
      chordManager.configureTonalSpace(center, 2);
      const resolved = resolveAllSimpleMajorTriads(center);
      expect(resolved).toHaveLength(SIMPLE_MAJOR_TRIAD_DEFS.length);

      for (const row of resolved) {
        expect(row.chordName).toBe(EXPECTED_SOURCE[row.id]);
        expect(MAJOR_LAYOUT_CHORDS.has(row.chordName)).toBe(true);
        expect(row.chordName).not.toBe('Flame');

        const chord = chordManager.getChordByName(row.chordName)!
        const livePcs = uniquePcs(chord.pitches);
        for (const pc of row.triadPitchClasses) {
          expect(livePcs).toContain(pc);
        }
        expect(row.triadPitchClasses).toHaveLength(3);
        expect(row.extraPitchClasses).toHaveLength(1);

        const def = SIMPLE_MAJOR_TRIAD_DEFS.find((item) => item.id === row.id)!;
        expect(uniquePcs(row.triadPitchClasses)).toEqual(
          uniquePcs(def.relativePcs.map((rel) => rel + center)),
        );
      }
    }
  });

  it('resolves each RN to the C-center triad PC set and elemental host', () => {
    const expected = [
      { id: 'I', chordName: 'Branch', pcs: [0, 4, 7] },
      { id: 'ii', chordName: 'Magma', pcs: [2, 5, 9] },
      { id: 'iii', chordName: 'Ember', pcs: [4, 7, 11] },
      { id: 'IV', chordName: 'Glass', pcs: [5, 9, 0] },
      { id: 'V', chordName: 'Ember', pcs: [7, 11, 2] },
      { id: 'vi', chordName: 'Branch', pcs: [9, 0, 4] },
      { id: 'vii_dim', chordName: 'Magma', pcs: [11, 2, 5] },
    ] as const;

    for (const row of expected) {
      const resolved = resolveSimpleMajorTriad(row.id, 0)!;
      expect(resolved.chordName).toBe(row.chordName);
      expect(uniquePcs(resolved.triadPitchClasses)).toEqual(uniquePcs(row.pcs));
      expect(
        resolved.extraPitchClasses.every((pc) => !row.pcs.includes(pc)),
      ).toBe(true);
    }

    chordManager.configureTonalSpace(10, 2);
    const tonicAtBb = resolveSimpleMajorTriad('I', 10)!;
    expect(tonicAtBb.chordName).toBe('Branch');
    expect(uniquePcs(tonicAtBb.triadPitchClasses)).toEqual([2, 5, 10]);
  });

  it('keeps issue #94 axis grouping', () => {
    const byId = Object.fromEntries(
      resolveAllSimpleMajorTriads(0).map((row) => [row.id, row]),
    );
    expect(byId.I.axis).toBe('earth_wind');
    expect(byId.vi.axis).toBe('earth_wind');
    expect(byId.ii.axis).toBe('earth_fire');
    expect(byId.IV.axis).toBe('earth_fire');
    expect(byId.vii_dim.axis).toBe('earth_fire');
    expect(byId.iii.axis).toBe('wind_fire');
    expect(byId.V.axis).toBe('wind_fire');
  });

  it('mutes only the extra pitch class so I and vi are distinct triads', () => {
    const branch = chordManager.getChordByName('Branch')!;
    const tonic = resolveSimpleMajorTriad('I', 0)!;
    const submediant = resolveSimpleMajorTriad('vi', 0)!;
    expect(tonic.chordName).toBe('Branch');
    expect(submediant.chordName).toBe('Branch');

    const tonicMuted = getMutedPitchClasses(
      branch,
      applySimpleTriadMutes(getInitialBorrowingState(), branch, tonic.triadPitchClasses),
    );
    const viMuted = getMutedPitchClasses(
      branch,
      applySimpleTriadMutes(
        getInitialBorrowingState(),
        branch,
        submediant.triadPitchClasses,
      ),
    );
    expect([...tonicMuted].sort((a, b) => a - b)).toEqual([9]);
    expect([...viMuted].sort((a, b) => a - b)).toEqual([7]);
  });

  it('formats captions from the live tonal center', () => {
    const tonic = SIMPLE_MAJOR_TRIAD_DEFS.find((def) => def.id === 'I')!;
    const leadingTone = SIMPLE_MAJOR_TRIAD_DEFS.find((def) => def.id === 'vii_dim')!;
    expect(formatSimpleTriadCaption(tonic, 0)).toBe('C');
    expect(formatSimpleTriadCaption(tonic, 10)).toBe('Bb');
    expect(formatSimpleTriadCaption(leadingTone, 0)).toBe('B°');
  });

  it('returns null for an unknown id without throwing', () => {
    expect(
      resolveSimpleMajorTriad('not_a_degree' as 'I', 0),
    ).toBeNull();
  });
});
