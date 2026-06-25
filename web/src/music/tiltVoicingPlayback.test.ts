import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import { getInitialBorrowingState } from './BorrowingLogic';
import { FLAT_TILT } from './TiltVoicingEngine';
import { computeTiltVoicedPitches } from './tiltVoicingPlayback';
import { resolveElementalPlayback } from './elementalRoot';

describe('computeTiltVoicedPitches', () => {
  let manager: ChordManager;
  const OCTAVE_RANGE = 3;
  const TONAL_CENTER = 10;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
  });

  it('voices Branch at flat tilt with contrary anchor', () => {
    manager.setTonalCenterOffset(0);
    const branch = manager.getChordByName('Branch')!;
    const pitches = computeTiltVoicedPitches(
      branch,
      getInitialBorrowingState(),
      FLAT_TILT,
      0,
      OCTAVE_RANGE,
      { anchor: 'contrary' }
    );
    expect(pitches.length).toBe(5);
    expect(Math.min(...pitches)).toBe(48);
  });

  it('keeps root in bass at Drop 3 with pivot anchor in static mode', () => {
    const branch = manager.getChordByName('Branch')!;
    const drop3 = { x: -0.25, y: 0 };
    const pitches = computeTiltVoicedPitches(
      branch,
      getInitialBorrowingState(),
      drop3,
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'pivot' }
    );
    expect(Math.min(...pitches)).toBe(58);
  });

  it('uses pre-resolved elemental metadata without a second resolve', () => {
    const branch = manager.getChordByName('Branch')!;
    const fireDict = manager.getChordByName('Fire')!;
    const resolved = resolveElementalPlayback(
      fireDict,
      TONAL_CENTER,
      OCTAVE_RANGE,
      branch
    );
    const withResolve = computeTiltVoicedPitches(
      resolved.chord,
      getInitialBorrowingState(),
      { x: -1, y: 0 },
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary', previousChord: branch }
    );
    const withElemental = computeTiltVoicedPitches(
      resolved.chord,
      getInitialBorrowingState(),
      { x: -1, y: 0 },
      TONAL_CENTER,
      OCTAVE_RANGE,
      {
        anchor: 'contrary',
        elemental: {
          rootPitchClass: resolved.rootPitchClass,
          homeMidi: resolved.homeMidi,
        },
      }
    );
    expect(withElemental).toEqual(withResolve);
  });

  it('anchors Fire register from resolved previous Fire, not dictionary default', () => {
    const twinBranch = manager.getChordByName('Twin Branch')!;
    const fireDict = manager.getChordByName('Fire')!;
    const resolvedFire = resolveElementalPlayback(
      fireDict,
      TONAL_CENTER,
      OCTAVE_RANGE,
      twinBranch
    ).chord;

    const fireAfterTwin = computeTiltVoicedPitches(
      resolvedFire,
      getInitialBorrowingState(),
      { x: -1, y: 0 },
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary', previousChord: twinBranch }
    );

    const fireAfterDictFire = computeTiltVoicedPitches(
      resolvedFire,
      getInitialBorrowingState(),
      { x: -1, y: 0 },
      TONAL_CENTER,
      OCTAVE_RANGE,
      { anchor: 'contrary', previousChord: fireDict }
    );

    expect(fireAfterTwin[0]).not.toBe(fireAfterDictFire[0]);
  });
});
