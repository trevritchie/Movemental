/**
 * Shared tilt resolution for playback and bass-degree labels.
 * Keeps smooth/smoothest and opposite-element rules in one place.
 */
import type { VoiceLeadingMode } from '@/context/types';
import type { Chord } from './ChordManager';
import {
  isElementalName,
  isOppositeElementNavigation,
  type ElementalName,
} from './elementalRoot';
import {
  getLockedNoTiltBass,
  getLockedNoTiltVoicing,
  isNoTiltBassLocked,
  isNoTiltVoicingLocked,
  type NoTiltChordLockMaps,
} from './noTiltChordLocks';
import {
  resolveSmoothNoTiltPlaybackTilt,
  resolveSmoothPlaybackTilt,
} from './predeterminedVoiceLeading';
import { computeEffectiveParallelSteps } from './smoothestVoiceLeading';
import {
  mapTiltToPositions,
  MAX_TILT_PITCH_STEPS,
  parallelLevelFromTilt,
  parallelStepsFromNoTiltPositionLevel,
  tiltSampleFromLevels,
  type TiltSample,
} from './TiltVoicingEngine';
import { clamp } from '../utils/clamp';

export function tiltFromNoTiltLevels(
  voicingLevel: number,
  positionLevel: number
): TiltSample {
  return tiltSampleFromLevels(
    voicingLevel,
    parallelStepsFromNoTiltPositionLevel(positionLevel)
  );
}

/**
 * Smooth mode on opposite-element navigation: preserve parallel from last tap.
 */
export function resolveSmoothOppositeElementTilt(
  _chord: Chord,
  _previousChord: Chord,
  liveTilt: TiltSample,
  lastTapTilt: TiltSample
): TiltSample {
  const { inputSteps } = mapTiltToPositions(liveTilt);
  const preservedParallel = parallelLevelFromTilt(lastTapTilt);
  return tiltSampleFromLevels(inputSteps, preservedParallel);
}

export function resolveSmoothPlaybackTiltForNavigation(
  chord: Chord,
  liveTilt: TiltSample,
  isChordChange: boolean,
  previousChord: Chord | null,
  lastTapTilt: TiltSample
): TiltSample {
  if (
    isChordChange &&
    isElementalName(chord.name) &&
    previousChord &&
    isOppositeElementNavigation(previousChord, chord.name as ElementalName)
  ) {
    return resolveSmoothOppositeElementTilt(
      chord,
      previousChord,
      liveTilt,
      lastTapTilt
    );
  }
  return resolveSmoothPlaybackTilt(chord.name, liveTilt);
}

export interface TiltBassLabelTiltContext {
  voiceLeadingMode?: VoiceLeadingMode;
  previousChord?: Chord | null;
  smoothBaseParallel?: number;
  lastTapTilt?: TiltSample;
}

/** Effective tilt for bass labels (smooth table + smoothest live delta). */
export function resolveEffectiveTiltForLabel(
  tilt: TiltSample,
  chord: Chord | null,
  context?: TiltBassLabelTiltContext
): TiltSample {
  if (!context || !chord) {
    return tilt;
  }

  const mode = context.voiceLeadingMode ?? 'root_position';

  if (mode === 'smooth') {
    if (
      context.previousChord &&
      context.lastTapTilt &&
      isElementalName(chord.name) &&
      isOppositeElementNavigation(context.previousChord, chord.name)
    ) {
      return resolveSmoothOppositeElementTilt(
        chord,
        context.previousChord,
        tilt,
        context.lastTapTilt
      );
    }
    return resolveSmoothPlaybackTilt(chord.name, tilt);
  }

  if (mode !== 'smoothest') {
    return tilt;
  }

  if (
    context.smoothBaseParallel === undefined ||
    !context.lastTapTilt
  ) {
    return tilt;
  }

  const effectiveParallel = computeEffectiveParallelSteps(
    context.smoothBaseParallel,
    context.lastTapTilt,
    tilt
  );
  const { inputSteps } = mapTiltToPositions(tilt);
  return tiltSampleFromLevels(inputSteps, effectiveParallel);
}

export interface SmoothReanchorTiltOptions {
  isChordChange: boolean;
  isFirstChord: boolean;
  isOppositeElement: boolean;
  lockMaps: NoTiltChordLockMaps;
  noTiltVoicingLevel: number;
  noTiltPositionLevel: number;
  lastNoTiltPositionLevel: number;
  resolveSmoothPlaybackTiltForNavigation: (
    chord: Chord,
    liveTilt: TiltSample,
    isChordChange: boolean
  ) => TiltSample;
  getCurrentControlTilt: () => TiltSample;
  syncNoTiltPositionLevel: (effectiveParallel: number) => void;
}

export function resolveSmoothReanchorTilt(
  displayChord: Chord,
  tiltMode: boolean,
  options: SmoothReanchorTiltOptions
): TiltSample {
  const {
    isChordChange,
    isFirstChord,
    isOppositeElement,
    lockMaps,
    noTiltVoicingLevel,
    noTiltPositionLevel,
    lastNoTiltPositionLevel,
    resolveSmoothPlaybackTiltForNavigation,
    getCurrentControlTilt,
    syncNoTiltPositionLevel,
  } = options;

  if (tiltMode) {
    return resolveSmoothPlaybackTiltForNavigation(
      displayChord,
      getCurrentControlTilt(),
      isChordChange
    );
  }

  if (isChordChange || isFirstChord) {
    const chordName = displayChord.name;
    const voicingLevel = isNoTiltVoicingLocked(lockMaps, chordName)
      ? getLockedNoTiltVoicing(lockMaps, chordName)!
      : noTiltVoicingLevel;

    if (isNoTiltBassLocked(lockMaps, chordName)) {
      return tiltFromNoTiltLevels(
        voicingLevel,
        getLockedNoTiltBass(lockMaps, chordName)!
      );
    }

    if (isOppositeElement) {
      const tilt = tiltFromNoTiltLevels(
        voicingLevel,
        lastNoTiltPositionLevel
      );
      syncNoTiltPositionLevel(parallelLevelFromTilt(tilt));
      return tilt;
    }

    const tilt = resolveSmoothNoTiltPlaybackTilt(chordName, voicingLevel);
    syncNoTiltPositionLevel(parallelLevelFromTilt(tilt));
    return tilt;
  }

  return tiltFromNoTiltLevels(noTiltVoicingLevel, noTiltPositionLevel);
}

export interface SmoothestReanchorCallbacks {
  applySmoothestVoiceLeading: (
    displayChord: Chord,
    elemental?: import('./tiltVoicingPlayback').ElementalPlaybackResolution
  ) => TiltSample;
  preserveSameChordSmoothestTilt: (chordName: string) => TiltSample;
  getBaselineTilt: () => TiltSample;
  getCurrentControlTilt: () => TiltSample;
  setSmoothBaseParallel: (parallel: number) => void;
}

export function resolveSmoothestReanchorTilt(
  displayChord: Chord,
  playbackTilt: TiltSample,
  neutralVoicingLength: number,
  isChordChange: boolean,
  smoothBaseParallelRef: { current: number },
  callbacks: SmoothestReanchorCallbacks
): TiltSample {
  if (neutralVoicingLength > 0) {
    if (isChordChange) {
      return callbacks.applySmoothestVoiceLeading(displayChord);
    }
    return callbacks.preserveSameChordSmoothestTilt(displayChord.name);
  }

  const baselineTilt = callbacks.getBaselineTilt();
  const currentTilt = callbacks.getCurrentControlTilt();
  const parallelDelta =
    parallelLevelFromTilt(currentTilt) -
    parallelLevelFromTilt(baselineTilt);
  const baseParallel = parallelLevelFromTilt(playbackTilt);
  const effectiveParallel = clamp(
    baseParallel + parallelDelta,
    -MAX_TILT_PITCH_STEPS,
    MAX_TILT_PITCH_STEPS
  );
  const { inputSteps } = mapTiltToPositions(currentTilt);
  const tilt = tiltSampleFromLevels(inputSteps, effectiveParallel);
  smoothBaseParallelRef.current = effectiveParallel;
  callbacks.setSmoothBaseParallel(effectiveParallel);
  return tilt;
}
