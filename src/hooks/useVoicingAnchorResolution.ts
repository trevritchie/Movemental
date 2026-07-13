/**
 * Voice-leading anchor resolution for chord playback.
 *
 * Extracted from useChordPlayback.ts: this sub-hook owns the pure(ish)
 * anchor-key/tilt math shared by all three voice-leading modes
 * (root_position, smooth, smoothest) - deciding what tilt sample and
 * neutral voicing a chord should resolve against, without touching audio
 * dispatch or React state that isn't part of that math. It is composed
 * into useChordPlayback rather than used standalone.
 */
import { useCallback, type RefObject } from 'react';
import { chordManager, type Chord } from '../music/ChordManager';
import {
  mapTiltToPositions,
  MAX_TILT_PITCH_STEPS,
  noTiltLevelsFromTilt,
  noTiltPositionLevelFromParallelSteps,
  parallelLevelFromTilt,
  parallelStepsFromNoTiltPositionLevel,
  tiltSampleFromLevels,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import {
  computeNeutralTiltVoicing,
  resolveVoicingRoot,
  type ElementalPlaybackResolution,
} from '../music/tiltVoicingPlayback';
import { resolveSmoothParallelSteps } from '../music/smoothestVoiceLeading';
import {
  tiltFromNoTiltLevels,
  resolveSmoothPlaybackTiltForNavigation as resolveSmoothNavTilt,
} from '../music/playbackTiltResolution';
import { usesDeviceTilt } from '../context/types';
import {
  getLockedNoTiltBass,
  getLockedNoTiltVoicing,
  isNoTiltBassLocked,
  isNoTiltVoicingLocked,
  type NoTiltChordLockMaps,
} from '../music/noTiltChordLocks';
import {
  armNoTiltRevoiceSuppress,
  type NoTiltRevoiceSuppressState,
} from '../music/noTiltRevoiceSuppress';
import { clamp } from '../utils/clamp';

interface UseVoicingAnchorResolutionOptions {
  tiltModeRef: RefObject<boolean>;
  tonalCenterRef: RefObject<number>;
  rawTiltRef: RefObject<TiltSample>;
  noTiltVoicingLevelRef: RefObject<number>;
  noTiltPositionLevelRef: RefObject<number>;
  previousChordRef: RefObject<Chord | null>;
  playbackTiltRef: RefObject<TiltSample>;
  neutralVoicingRef: RefObject<number[]>;
  lastTapTiltRef: RefObject<TiltSample>;
  lastCommittedPlaybackTiltRef: RefObject<TiltSample>;
  smoothBaseParallelRef: RefObject<number>;
  lastNoTiltVoicingLevelRef: RefObject<number>;
  lastNoTiltPositionLevelRef: RefObject<number>;
  noTiltLockMapsRef: RefObject<NoTiltChordLockMaps>;
  suppressNoTiltRevoiceRef: RefObject<NoTiltRevoiceSuppressState>;
  setNoTiltPositionLevel: (level: number) => void;
}

/**
 * Composes the anchor-key, neutral-voicing, and smoothest-voice-leading
 * resolvers that useChordPlayback needs on every chord commit. All refs are
 * owned by the caller (useChordPlayback); this hook only reads/writes them.
 */
export function useVoicingAnchorResolution({
  tiltModeRef,
  tonalCenterRef,
  rawTiltRef,
  noTiltVoicingLevelRef,
  noTiltPositionLevelRef,
  previousChordRef,
  playbackTiltRef,
  neutralVoicingRef,
  lastTapTiltRef,
  lastCommittedPlaybackTiltRef,
  smoothBaseParallelRef,
  lastNoTiltVoicingLevelRef,
  lastNoTiltPositionLevelRef,
  noTiltLockMapsRef,
  suppressNoTiltRevoiceRef,
  setNoTiltPositionLevel,
}: UseVoicingAnchorResolutionOptions) {
  const buildAnchorKey = useCallback(
    (displayChord: Chord, tilt: TiltSample): string => {
      const tonalCenter = tonalCenterRef.current;
      const octaveRange = chordManager.getOctaveRange();
      if (usesDeviceTilt(tiltModeRef.current)) {
        const { inputSteps, parallelSteps } = mapTiltToPositions(tilt);
        return [
          displayChord.name,
          tonalCenter,
          octaveRange,
          'tilt',
          inputSteps,
          parallelSteps,
        ].join('|');
      }
      const { voicingLevel, positionLevel } = noTiltLevelsFromTilt(tilt);
      return [
        displayChord.name,
        tonalCenter,
        octaveRange,
        'no_tilt',
        voicingLevel,
        positionLevel,
      ].join('|');
    },
    [tonalCenterRef, tiltModeRef]
  );

  const computeNeutralVoicing = useCallback(
    (
      displayChord: Chord,
      tilt: TiltSample,
      elemental?: ElementalPlaybackResolution
    ): number[] => {
      const anchor = usesDeviceTilt(tiltModeRef.current) ? 'contrary' : 'pivot';
      return computeNeutralTiltVoicing(
        displayChord,
        tilt,
        tonalCenterRef.current,
        chordManager.getOctaveRange(),
        {
          anchor,
          previousChord: previousChordRef.current,
          elemental,
        }
      );
    },
    [tonalCenterRef, tiltModeRef, previousChordRef]
  );

  const resolvePlaybackTilt = useCallback(
    (fromPointer: boolean): TiltSample => {
      if (!usesDeviceTilt(tiltModeRef.current)) {
        return tiltFromNoTiltLevels(
          noTiltVoicingLevelRef.current,
          noTiltPositionLevelRef.current
        );
      }
      if (fromPointer) {
        playbackTiltRef.current = { ...rawTiltRef.current };
      }
      return playbackTiltRef.current;
    },
    [rawTiltRef, noTiltVoicingLevelRef, noTiltPositionLevelRef, tiltModeRef, playbackTiltRef]
  );

  const getBaselineTilt = useCallback((): TiltSample => {
    if (usesDeviceTilt(tiltModeRef.current)) {
      return lastTapTiltRef.current;
    }
    return tiltFromNoTiltLevels(
      lastNoTiltVoicingLevelRef.current,
      lastNoTiltPositionLevelRef.current
    );
  }, [tiltModeRef, lastTapTiltRef, lastNoTiltVoicingLevelRef, lastNoTiltPositionLevelRef]);

  const getCurrentControlTilt = useCallback((): TiltSample => {
    if (usesDeviceTilt(tiltModeRef.current)) {
      return { ...rawTiltRef.current };
    }
    return tiltFromNoTiltLevels(
      noTiltVoicingLevelRef.current,
      noTiltPositionLevelRef.current
    );
  }, [rawTiltRef, noTiltVoicingLevelRef, noTiltPositionLevelRef, tiltModeRef]);

  const syncNoTiltPositionLevel = useCallback(
    (effectiveParallel: number, deferSetState = false) => {
      const newLevel = noTiltPositionLevelFromParallelSteps(effectiveParallel);
      noTiltPositionLevelRef.current = newLevel;
      if (deferSetState) {
        queueMicrotask(() => {
          // Pair suppress with the deferred setState so the re-voice effect
          // skips one redundant pass after pointer audio already voiced.
          armNoTiltRevoiceSuppress(suppressNoTiltRevoiceRef.current);
          setNoTiltPositionLevel(newLevel);
        });
      } else {
        setNoTiltPositionLevel(newLevel);
      }
    },
    [setNoTiltPositionLevel, noTiltPositionLevelRef, suppressNoTiltRevoiceRef]
  );

  /**
   * Smoothest re-anchor. Writes refs only; React level/baseline flush happens
   * after audio in commitPlayback. Optional syncPositionLevel defers setState
   * on pointer taps (same contract as smooth mode).
   */
  const applySmoothestVoiceLeading = useCallback(
    (
      displayChord: Chord,
      elemental?: ElementalPlaybackResolution,
      syncPositionLevel: (effectiveParallel: number) => void = syncNoTiltPositionLevel
    ): TiltSample => {
      const lockMaps = noTiltLockMapsRef.current;
      const chordName = displayChord.name;

      if (!usesDeviceTilt(tiltModeRef.current)) {
        const voicingLocked = isNoTiltVoicingLocked(lockMaps, chordName);
        const bassLocked = isNoTiltBassLocked(lockMaps, chordName);

        if (voicingLocked && bassLocked) {
          const effectiveTilt = tiltFromNoTiltLevels(
            getLockedNoTiltVoicing(lockMaps, chordName)!,
            getLockedNoTiltBass(lockMaps, chordName)!
          );
          const effectiveParallel = parallelLevelFromTilt(effectiveTilt);
          smoothBaseParallelRef.current = effectiveParallel;
          return effectiveTilt;
        }
      }

      const baselineTilt = getBaselineTilt();
      const currentTilt = getCurrentControlTilt();
      const anchor = usesDeviceTilt(tiltModeRef.current) ? 'contrary' : 'pivot';
      const { rootPitchClass, homeMidi, pitchStructure } = resolveVoicingRoot(
        displayChord,
        tonalCenterRef.current,
        chordManager.getOctaveRange(),
        elemental
      );

      const searchBaseline =
        !usesDeviceTilt(tiltModeRef.current) &&
        isNoTiltVoicingLocked(lockMaps, chordName)
          ? tiltFromNoTiltLevels(
              getLockedNoTiltVoicing(lockMaps, chordName)!,
              noTiltPositionLevelRef.current
            )
          : baselineTilt;

      let effectiveParallel = resolveSmoothParallelSteps(
        neutralVoicingRef.current,
        pitchStructure,
        rootPitchClass,
        searchBaseline,
        tonalCenterRef.current,
        chordManager.getOctaveRange(),
        anchor,
        homeMidi
      );
      const parallelDelta =
        parallelLevelFromTilt(currentTilt) -
        parallelLevelFromTilt(baselineTilt);
      effectiveParallel = clamp(
        effectiveParallel + parallelDelta,
        -MAX_TILT_PITCH_STEPS,
        MAX_TILT_PITCH_STEPS
      );

      if (
        !usesDeviceTilt(tiltModeRef.current) &&
        isNoTiltBassLocked(lockMaps, chordName)
      ) {
        effectiveParallel = parallelStepsFromNoTiltPositionLevel(
          getLockedNoTiltBass(lockMaps, chordName)!
        );
      }

      const { inputSteps: currentWidth } = mapTiltToPositions(currentTilt);
      const inputSteps =
        !usesDeviceTilt(tiltModeRef.current) &&
        isNoTiltVoicingLocked(lockMaps, chordName)
          ? getLockedNoTiltVoicing(lockMaps, chordName)!
          : currentWidth;
      const effectiveTilt = tiltSampleFromLevels(
        inputSteps,
        effectiveParallel
      );

      smoothBaseParallelRef.current = effectiveParallel;

      if (
        !usesDeviceTilt(tiltModeRef.current) &&
        !isNoTiltBassLocked(lockMaps, chordName)
      ) {
        syncPositionLevel(effectiveParallel);
      }

      return effectiveTilt;
    },
    [
      getBaselineTilt,
      getCurrentControlTilt,
      syncNoTiltPositionLevel,
      tonalCenterRef,
      noTiltLockMapsRef,
      noTiltPositionLevelRef,
      tiltModeRef,
      neutralVoicingRef,
      smoothBaseParallelRef,
    ]
  );

  const preserveSameChordSmoothestTilt = useCallback(
    (
      chordName: string,
      syncPositionLevel: (effectiveParallel: number) => void = syncNoTiltPositionLevel
    ): TiltSample => {
      const currentTilt = getCurrentControlTilt();
      const parallelDelta =
        parallelLevelFromTilt(currentTilt) -
        parallelLevelFromTilt(lastTapTiltRef.current);
      const lockMaps = noTiltLockMapsRef.current;
      let effectiveParallel = clamp(
        smoothBaseParallelRef.current + parallelDelta,
        -MAX_TILT_PITCH_STEPS,
        MAX_TILT_PITCH_STEPS
      );

      if (!usesDeviceTilt(tiltModeRef.current) && isNoTiltBassLocked(lockMaps, chordName)) {
        effectiveParallel = parallelStepsFromNoTiltPositionLevel(
          getLockedNoTiltBass(lockMaps, chordName)!
        );
      }

      const { inputSteps } = mapTiltToPositions(currentTilt);
      const voicingInputSteps =
        !usesDeviceTilt(tiltModeRef.current) &&
        isNoTiltVoicingLocked(lockMaps, chordName)
          ? getLockedNoTiltVoicing(lockMaps, chordName)!
          : inputSteps;
      const effectiveTilt = tiltSampleFromLevels(
        voicingInputSteps,
        effectiveParallel
      );

      if (
        !usesDeviceTilt(tiltModeRef.current) &&
        !isNoTiltBassLocked(lockMaps, chordName)
      ) {
        syncPositionLevel(effectiveParallel);
      }

      return effectiveTilt;
    },
    [
      getCurrentControlTilt,
      syncNoTiltPositionLevel,
      noTiltLockMapsRef,
      lastTapTiltRef,
      smoothBaseParallelRef,
      tiltModeRef,
    ]
  );

  const resolveSmoothPlaybackTiltForNavigation = useCallback(
    (
      chord: Chord,
      liveTilt: TiltSample,
      isChordChange: boolean
    ): TiltSample => {
      return resolveSmoothNavTilt(
        chord,
        liveTilt,
        isChordChange,
        previousChordRef.current,
        lastTapTiltRef.current,
        lastCommittedPlaybackTiltRef.current
      );
    },
    [previousChordRef, lastTapTiltRef, lastCommittedPlaybackTiltRef]
  );

  return {
    buildAnchorKey,
    computeNeutralVoicing,
    resolvePlaybackTilt,
    getBaselineTilt,
    getCurrentControlTilt,
    syncNoTiltPositionLevel,
    applySmoothestVoiceLeading,
    preserveSameChordSmoothestTilt,
    resolveSmoothPlaybackTiltForNavigation,
  };
}
