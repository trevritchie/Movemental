import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import { OCTAVE } from './config';
import {
  getFlatParallelStepsForChord,
  resolveSmoothNoTiltPlaybackTilt,
} from './predeterminedVoiceLeading';
import {
  DEFAULT_NO_TILT_VOICING_LEVEL,
  noTiltPositionLevelFromParallelSteps,
  parallelLevelFromTilt,
  parallelStepsFromNoTiltPositionLevel,
  tiltSampleFromLevels,
} from './TiltVoicingEngine';
import { computeNeutralTiltVoicing } from './tiltVoicingPlayback';
import {
  applyNoTiltLocksForChord,
  createEmptyNoTiltChordLockMaps,
  lockNoTiltBass,
  lockNoTiltVoicing,
} from './noTiltChordLocks';

const TONAL_CENTER = 10;
const OCTAVE_RANGE = 2;

function tiltFromNoTiltLevels(
  voicingLevel: number,
  positionLevel: number
) {
  return tiltSampleFromLevels(
    voicingLevel,
    parallelStepsFromNoTiltPositionLevel(positionLevel)
  );
}

function bassMidi(
  manager: ChordManager,
  chordName: string,
  tilt: ReturnType<typeof tiltSampleFromLevels>
): number {
  const chord = manager.getChordByName(chordName)!;
  const pitches = computeNeutralTiltVoicing(
    chord,
    tilt,
    TONAL_CENTER,
    OCTAVE_RANGE,
    { anchor: 'pivot' }
  );
  return Math.min(...pitches);
}

describe('resolveSmoothNoTiltPlaybackTilt', () => {
  it('uses predetermined parallel only, ignoring stale position offset', () => {
    const flameParallel = getFlatParallelStepsForChord('Flame');
    expect(flameParallel).toBe(-2);

    const branchTilt = resolveSmoothNoTiltPlaybackTilt(
      'Branch',
      DEFAULT_NO_TILT_VOICING_LEVEL
    );
    expect(parallelLevelFromTilt(branchTilt)).toBe(0);
    expect(getFlatParallelStepsForChord('Branch')).toBe(0);
  });
});

describe('smooth no-tilt playback behavior', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
    manager.setOctaveRange(OCTAVE_RANGE);
  });

  it('resets bass to root when changing from Flame to Branch', () => {
    const voicing = DEFAULT_NO_TILT_VOICING_LEVEL;
    const stalePosition = noTiltPositionLevelFromParallelSteps(-2);
    const staleBranchTilt = tiltFromNoTiltLevels(voicing, stalePosition);
    expect(parallelLevelFromTilt(staleBranchTilt)).toBe(-2);

    const resetBranchTilt = resolveSmoothNoTiltPlaybackTilt('Branch', voicing);
    expect(parallelLevelFromTilt(resetBranchTilt)).toBe(0);

    const resetBass = bassMidi(manager, 'Branch', resetBranchTilt);
    const staleBass = bassMidi(manager, 'Branch', staleBranchTilt);
    expect(resetBass).not.toBe(staleBass);
    expect(resetBass).toBe(46);
    expect(resetBass % OCTAVE).toBe(TONAL_CENTER);
  });

  it('preserves manual bass on same-chord re-tap', () => {
    const fifthPosition = noTiltPositionLevelFromParallelSteps(-2);
    const manualBranchTilt = tiltFromNoTiltLevels(
      DEFAULT_NO_TILT_VOICING_LEVEL,
      fifthPosition
    );
    const bassBefore = bassMidi(manager, 'Branch', manualBranchTilt);

    const retapTilt = tiltFromNoTiltLevels(
      DEFAULT_NO_TILT_VOICING_LEVEL,
      fifthPosition
    );
    expect(bassMidi(manager, 'Branch', retapTilt)).toBe(bassBefore);
  });

  it('keeps bass fixed when only voicing width changes', () => {
    const branchTilt = resolveSmoothNoTiltPlaybackTilt(
      'Branch',
      DEFAULT_NO_TILT_VOICING_LEVEL
    );
    const bassBefore = bassMidi(manager, 'Branch', branchTilt);

    const narrowerVoicing = tiltSampleFromLevels(3, 0);
    const bassAfter = bassMidi(manager, 'Branch', narrowerVoicing);

    expect(bassAfter).toBe(bassBefore);
    expect(bassAfter % OCTAVE).toBe(TONAL_CENTER);
  });

  it('keeps locked bass when returning to Branch in smooth mode', () => {
    const fifthPosition = noTiltPositionLevelFromParallelSteps(-2);
    const maps = lockNoTiltBass(
      createEmptyNoTiltChordLockMaps(),
      'Branch',
      fifthPosition
    );
    const voicingRef = { current: DEFAULT_NO_TILT_VOICING_LEVEL };
    const positionRef = {
      current: noTiltPositionLevelFromParallelSteps(0),
    };

    applyNoTiltLocksForChord(maps, 'Branch', {
      noTiltVoicingLevelRef: voicingRef,
      noTiltPositionLevelRef: positionRef,
      setNoTiltVoicingLevel: (level) => {
        voicingRef.current = level;
      },
      setNoTiltPositionLevel: (level) => {
        positionRef.current = level;
      },
    });

    const lockedTilt = tiltFromNoTiltLevels(
      voicingRef.current,
      positionRef.current
    );
    const smoothResetTilt = resolveSmoothNoTiltPlaybackTilt(
      'Branch',
      DEFAULT_NO_TILT_VOICING_LEVEL
    );

    expect(parallelLevelFromTilt(smoothResetTilt)).toBe(0);
    expect(parallelLevelFromTilt(lockedTilt)).toBe(-2);

    const lockedBass = bassMidi(manager, 'Branch', lockedTilt);
    const resetBass = bassMidi(manager, 'Branch', smoothResetTilt);
    expect(lockedBass).not.toBe(resetBass);
    expect(lockedBass % OCTAVE).not.toBe(TONAL_CENTER);
  });

  it('keeps locked voicing when returning to Branch after visiting Flame', () => {
    const closeVoicing = 3;
    const maps = lockNoTiltVoicing(
      createEmptyNoTiltChordLockMaps(),
      'Branch',
      closeVoicing
    );
    const voicingRef = { current: 8 };
    const positionRef = {
      current: noTiltPositionLevelFromParallelSteps(0),
    };

    applyNoTiltLocksForChord(maps, 'Branch', {
      noTiltVoicingLevelRef: voicingRef,
      noTiltPositionLevelRef: positionRef,
      setNoTiltVoicingLevel: (level) => {
        voicingRef.current = level;
      },
      setNoTiltPositionLevel: (level) => {
        positionRef.current = level;
      },
    });

    const flameTilt = tiltFromNoTiltLevels(8, positionRef.current);
    const branchLockedTilt = tiltFromNoTiltLevels(
      voicingRef.current,
      positionRef.current
    );

    const flameBass = bassMidi(manager, 'Flame', flameTilt);
    const branchBass = bassMidi(manager, 'Branch', branchLockedTilt);
    expect(voicingRef.current).toBe(closeVoicing);
    expect(branchBass).not.toBe(flameBass);
  });
});
