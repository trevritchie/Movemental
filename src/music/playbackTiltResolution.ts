/**
 * Shared tilt resolution for playback and bass-degree labels.
 * Keeps smooth/smoothest and opposite-element rules in one place.
 */
import type { VoiceLeadingMode } from '@/context/types';
import type { Chord } from './ChordManager';
import {
  isElementalName,
  isOppositeElementNavigation,
  resolveWindEntryBaseline,
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

function pitchDeltaSinceLastControl(
  liveTilt: TiltSample,
  lastControlTilt: TiltSample
): number {
  return (
    parallelLevelFromTilt(liveTilt) - parallelLevelFromTilt(lastControlTilt)
  );
}

function tiltWithEntryBaselineAndDelta(
  liveTilt: TiltSample,
  lastControlTilt: TiltSample,
  entryBaseline: number
): TiltSample {
  const { inputSteps } = mapTiltToPositions(liveTilt);
  const effectiveParallel = clamp(
    entryBaseline + pitchDeltaSinceLastControl(liveTilt, lastControlTilt),
    -MAX_TILT_PITCH_STEPS,
    MAX_TILT_PITCH_STEPS
  );
  return tiltSampleFromLevels(inputSteps, effectiveParallel);
}

/**
 * Smooth mode on opposite-element navigation: preserve committed parallel
 * from the previous chord plus pitch delta since last control tilt.
 */
export function resolveSmoothOppositeElementTilt(
  liveTilt: TiltSample,
  lastControlTilt: TiltSample,
  lastCommittedPlaybackTilt: TiltSample
): TiltSample {
  return tiltWithEntryBaselineAndDelta(
    liveTilt,
    lastControlTilt,
    parallelLevelFromTilt(lastCommittedPlaybackTilt)
  );
}

export function resolveSmoothPlaybackTiltForNavigation(
  chord: Chord,
  liveTilt: TiltSample,
  isChordChange: boolean,
  previousChord: Chord | null,
  lastControlTilt: TiltSample,
  lastCommittedPlaybackTilt: TiltSample
): TiltSample {
  if (!isChordChange || !previousChord) {
    return resolveSmoothPlaybackTilt(chord.name, liveTilt);
  }

  if (
    isElementalName(chord.name) &&
    isOppositeElementNavigation(previousChord, chord.name as ElementalName)
  ) {
    return resolveSmoothOppositeElementTilt(
      liveTilt,
      lastControlTilt,
      lastCommittedPlaybackTilt
    );
  }

  if (chord.name === 'Wind') {
    return tiltWithEntryBaselineAndDelta(
      liveTilt,
      lastControlTilt,
      resolveWindEntryBaseline(previousChord)
    );
  }

  return resolveSmoothPlaybackTilt(chord.name, liveTilt);
}

/**
 * Smooth no-tilt playback tilt on chord change: table baseline, Wind axis
 * entry, or opposite-element position preservation.
 */
export function resolveSmoothNoTiltPlaybackTiltForNavigation(
  chord: Chord,
  voicingLevel: number,
  isChordChange: boolean,
  previousChord: Chord | null,
  isOppositeElement: boolean,
  lastNoTiltPositionLevel: number
): TiltSample {
  if (isOppositeElement && isChordChange) {
    return tiltFromNoTiltLevels(voicingLevel, lastNoTiltPositionLevel);
  }

  if (isChordChange && previousChord && chord.name === 'Wind') {
    return tiltSampleFromLevels(
      voicingLevel,
      resolveWindEntryBaseline(previousChord)
    );
  }

  return resolveSmoothNoTiltPlaybackTilt(chord.name, voicingLevel);
}

export interface TiltBassLabelTiltContext {
  voiceLeadingMode?: VoiceLeadingMode;
  previousChord?: Chord | null;
  smoothBaseParallel?: number;
  /** Raw device tilt at the last diagram tap. */
  lastTapTilt?: TiltSample;
  /** Resolved playback tilt committed at the last diagram tap. */
  lastCommittedPlaybackTilt?: TiltSample;
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
    const previousChord = context.previousChord;
    const isChordChange =
      previousChord !== null &&
      previousChord !== undefined &&
      previousChord.name !== chord.name;
    const lastControlTilt = context.lastTapTilt;
    const lastCommittedPlaybackTilt = context.lastCommittedPlaybackTilt;

    if (
      isChordChange &&
      previousChord &&
      lastControlTilt &&
      lastCommittedPlaybackTilt
    ) {
      return resolveSmoothPlaybackTiltForNavigation(
        chord,
        tilt,
        true,
        previousChord,
        lastControlTilt,
        lastCommittedPlaybackTilt
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
  previousChord: Chord | null;
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
    previousChord,
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

    const tilt = resolveSmoothNoTiltPlaybackTiltForNavigation(
      displayChord,
      voicingLevel,
      isChordChange,
      previousChord,
      isOppositeElement,
      lastNoTiltPositionLevel
    );
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
  // Ref only; React flush happens after audio in commitPlayback.
  smoothBaseParallelRef.current = effectiveParallel;
  return tilt;
}
