/**
 * Bass degree labels for the IN THE BASS readout.
 *
 * Tilt mode: derive the label from the lowest *sounded* pitch (contrary anchor,
 * both roll and pitch axes). No-tilt mode: position dropdown uses signed parallel
 * steps via getBassDegreeLabelForParallelSteps.
 */
import type { Chord } from './ChordManager';
import { borrowingLogic, getInitialBorrowingState, type BorrowingState } from './BorrowingLogic';
import type { PlayStyle, VoiceLeadingMode } from '../context/types';
import { isNoTiltPlayStyle } from '../context/types';
import { resolveSmoothPlaybackTilt } from './predeterminedVoiceLeading';
import { computeEffectiveParallelSteps } from './smoothestVoiceLeading';
import {
  mapTiltToPositions,
  NO_TILT_POSITION_LEVEL_COUNT,
  parallelLevelFromTilt,
  parallelStepsFromNoTiltPositionLevel,
  positionLabelIndexFromParallelSteps,
  tiltSampleFromLevels,
  tiltVoicingLevelName,
  type TiltSample,
  type TiltVoicingAnchor,
} from './TiltVoicingEngine';
import { getCachedTiltVoicedPitches } from './voicingCache';
import {
  isElementalName,
  isOppositeElementNavigation,
} from './elementalRoot';
import type { ElementalPlaybackResolution } from './tiltVoicingPlayback';
import { spellChordDegrees } from './chordSpelling';
import { normalizePitchClass } from './pitchClass';

export type VoiceLine = 1 | 2 | 3 | 4;

export const TILT_BASS_DEGREE_MOBILE_MAX_LABEL = '\u2191 Root';
export const TILT_BASS_DEGREE_DESKTOP_MAX_LABEL = TILT_BASS_DEGREE_MOBILE_MAX_LABEL;

const DEFAULT_FOURTH_DEGREE = '6th';

export interface TiltBassLabelContext {
  tonalCenter: number;
  octaveRange: number;
  borrowingState: BorrowingState;
  previousChord?: Chord | null;
  voiceLeadingMode?: VoiceLeadingMode;
  /** Smoothest only: parallel committed at last tap before live pitch delta. */
  smoothBaseParallel?: number;
  /** Smoothest only: raw tilt at the last diagram tap. */
  lastTapTilt?: TiltSample;
  playStyle?: PlayStyle;
  /** Resolved elemental root/register from playback (opposite-element navigation). */
  elemental?: ElementalPlaybackResolution;
  /** When set, derive the bass degree from these sounded pitches (matches readout). */
  activePitches?: number[];
}

function resolveEffectiveTilt(
  tilt: TiltSample,
  context?: TiltBassLabelContext,
  chord?: Chord | null
): TiltSample {
  if (!context) {
    return tilt;
  }

  const mode = context.voiceLeadingMode ?? 'root_position';

  if (mode === 'smooth' && chord) {
    if (
      context.previousChord &&
      context.lastTapTilt &&
      isElementalName(chord.name) &&
      isOppositeElementNavigation(context.previousChord, chord.name)
    ) {
      const { inputSteps } = mapTiltToPositions(tilt);
      const preservedParallel = parallelLevelFromTilt(context.lastTapTilt);
      return tiltSampleFromLevels(inputSteps, preservedParallel);
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

function voicingAnchorForPlayStyle(playStyle?: PlayStyle): TiltVoicingAnchor {
  if (playStyle && isNoTiltPlayStyle(playStyle)) {
    return 'pivot';
  }
  return 'contrary';
}

function borrowingPitchStructure(
  chord: Chord,
  borrowingState: BorrowingState
): (number | null)[] {
  return borrowingLogic.prepareVoicingInput(chord, borrowingState)
    .pitchStructure;
}

export function getFourthVoiceDegreeLabel(chord: Chord | null): string {
  if (!chord?.quality) {
    return DEFAULT_FOURTH_DEGREE;
  }

  if (
    chord.quality === ' diminished' ||
    chord.quality === ' maj6' ||
    chord.quality === ' min6'
  ) {
    return '6th';
  }

  if (chord.quality === '7' || chord.quality === '7b5') {
    return '7th';
  }

  return DEFAULT_FOURTH_DEGREE;
}

export function getVoiceDegreeLabel(
  voiceLine: VoiceLine,
  chord: Chord | null
): string {
  switch (voiceLine) {
    case 1:
      return 'Root';
    case 2:
      return '3rd';
    case 3:
      return '5th';
    case 4:
      return getFourthVoiceDegreeLabel(chord);
    default:
      return 'Root';
  }
}

export function formatBassDegreeLabel(degree: string): string {
  return degree;
}

/**
 * Prefix ↑ or ↓ from phone pitch (positive = chest-ward, negative = away).
 * Static position dropdown passes ladder steps; tilt readout passes pitch axis only.
 */
export function formatBassDegreeWithDirection(
  degree: string,
  arrowSteps: number
): string {
  if (arrowSteps > 0) {
    return `\u2191 ${degree}`;
  }
  if (arrowSteps < 0) {
    return `\u2193 ${degree}`;
  }
  return degree;
}

/** Signed pitch-axis steps from live tilt (roll ignored). Drives ↑/↓ in tilt mode. */
export function pitchAxisArrowSteps(tilt: TiltSample): number {
  return parallelLevelFromTilt(tilt);
}

export function voiceLineForParallelSteps(parallelSteps: number): VoiceLine {
  const idx = positionLabelIndexFromParallelSteps(parallelSteps);
  return (Math.max(0, Math.min(3, idx)) + 1) as VoiceLine;
}

export function getBassDegreeLabelForParallelSteps(
  parallelSteps: number,
  chord: Chord | null
): string {
  const voiceLine = voiceLineForParallelSteps(parallelSteps);
  const degree = getVoiceDegreeLabel(voiceLine, chord);
  return formatBassDegreeWithDirection(formatBassDegreeLabel(degree), parallelSteps);
}

/** @deprecated Use getBassDegreeLabelForParallelSteps with unsigned steps 0..3. */
export function getBassDegreeLabelForPositionIndex(
  positionIndex: number,
  chord: Chord | null
): string {
  const clampedIndex = Math.max(0, Math.min(3, positionIndex));
  return getBassDegreeLabelForParallelSteps(clampedIndex, chord);
}

function voiceLineFromSpelledDegrees(
  chord: Chord,
  lowestPitchClass: number
): VoiceLine | null {
  if (!chord.quality || chord.rootPositionIndex === undefined) {
    return null;
  }
  const rootPitchClass = normalizePitchClass(
    chord.pitches[chord.rootPositionIndex]
  );
  const degrees = spellChordDegrees(rootPitchClass, chord.quality);
  const index = degrees.findIndex(
    (degree) => degree.pitchClass === lowestPitchClass
  );
  if (index === -1) {
    return null;
  }
  return (index + 1) as VoiceLine;
}

function voiceLineForLowestPitch(
  voiced: number[],
  pitchStructure: (number | null)[],
  chord: Chord
): VoiceLine | null {
  if (voiced.length === 0) {
    return null;
  }

  const lowestPc = normalizePitchClass(Math.min(...voiced));
  const spelledLine = voiceLineFromSpelledDegrees(chord, lowestPc);
  if (spelledLine !== null) {
    return spelledLine;
  }

  const mapping = borrowingLogic.getRootPositionMapping(chord);

  // Map pitch class back to chord line 1-4. If borrowing collapsed two lines
  // to the same PC, the first matching line wins.
  for (let line = 1; line <= 4; line++) {
    const slotIdx = mapping[line];
    const pitch = pitchStructure[slotIdx];
    if (pitch === null) {
      continue;
    }
    const pc = normalizePitchClass(pitch);
    if (pc === lowestPc) {
      return line as VoiceLine;
    }
  }

  return null;
}

/** Bass degree label from sounded MIDI pitches (matches playback voicing). */
export function bassDegreeLabelFromVoiced(
  chord: Chord,
  voicedPitches: number[],
  borrowingState: BorrowingState
): string | null {
  const structure = borrowingPitchStructure(chord, borrowingState);
  const line = voiceLineForLowestPitch(voicedPitches, structure, chord);
  return line ? getVoiceDegreeLabel(line, chord) : null;
}

function pitchOnlyVoiceLine(tilt: TiltSample): VoiceLine {
  // Fallback when voicing context is missing or PC mapping fails.
  const steps = parallelLevelFromTilt(tilt);
  return voiceLineForParallelSteps(steps);
}

export function resolveTiltBassVoiceLine(
  tilt: TiltSample,
  chord: Chord | null,
  context: TiltBassLabelContext
): VoiceLine | null {
  if (!chord) {
    return null;
  }

  const playedPitches = context.activePitches?.filter(
    (pitch): pitch is number => pitch !== null
  );
  if (playedPitches && playedPitches.length > 0) {
    const structure = borrowingPitchStructure(chord, context.borrowingState);
    const line = voiceLineForLowestPitch(playedPitches, structure, chord);
    if (line !== null) {
      return line;
    }
  }

  const effectiveTilt = resolveEffectiveTilt(tilt, context, chord);
  const mode = context.voiceLeadingMode ?? 'smooth';
  const deterministicElemental =
    mode === 'smooth' &&
    isElementalName(chord.name) &&
    !context.elemental;
  const voiced = getCachedTiltVoicedPitches(
    chord,
    context.borrowingState,
    effectiveTilt,
    context.tonalCenter,
    context.octaveRange,
    {
      anchor: voicingAnchorForPlayStyle(context.playStyle),
      previousChord: context.previousChord,
      elemental: context.elemental,
      voiceLeadingMode: context.voiceLeadingMode,
      deterministicElemental,
      ...(mode === 'smoothest'
        ? {
            smoothBaseParallel: context.smoothBaseParallel,
            lastTapTilt: context.lastTapTilt,
          }
        : {}),
    }
  );
  const structure = borrowingPitchStructure(chord, context.borrowingState);
  const line = voiceLineForLowestPitch(voiced, structure, chord);
  return line ?? pitchOnlyVoiceLine(effectiveTilt);
}

/** @deprecated Use tiltBassDegreeLabel (roll-aware degree, pitch-only arrows). */
export function tiltBassPositionLabel(
  tilt: TiltSample,
  chord: Chord | null,
  context?: TiltBassLabelContext
): string {
  return tiltBassDegreeLabel(tilt, chord, context);
}

/** Voicing width committed at the last diagram tap. */
export function lastPlayedVoicingReadout(playbackTilt: TiltSample): string {
  return tiltVoicingLevelName(playbackTilt);
}

/** Bass degree committed at the last diagram tap (no direction arrow). */
export function lastPlayedBassReadout(
  playbackTilt: TiltSample,
  chord: Chord | null,
  options: {
    voicedPitches?: number[];
    borrowingState?: BorrowingState;
  } = {}
): string {
  if (chord && options.voicedPitches && options.voicedPitches.length > 0) {
    const fromVoicing = bassDegreeLabelFromVoiced(
      chord,
      options.voicedPitches,
      options.borrowingState ?? getInitialBorrowingState()
    );
    if (fromVoicing) {
      return fromVoicing;
    }
  }
  const parallelSteps = parallelLevelFromTilt(playbackTilt);
  return getVoiceDegreeLabel(
    voiceLineForParallelSteps(parallelSteps),
    chord
  );
}

/** Committed voicing at last tap, e.g. "Drop 2 / 3rd". */
export function formatLastPlayedTiltReadout(
  playbackTilt: TiltSample,
  chord: Chord | null
): string {
  return `${lastPlayedVoicingReadout(playbackTilt)} / ${lastPlayedBassReadout(
    playbackTilt,
    chord
  )}`;
}

export function tiltBassDegreeLabel(
  tilt: TiltSample,
  chord: Chord | null,
  context?: TiltBassLabelContext
): string {
  const effectiveTilt = resolveEffectiveTilt(tilt, context, chord);
  const voiceLine: VoiceLine =
    context && chord
      ? resolveTiltBassVoiceLine(tilt, chord, context) ??
        pitchOnlyVoiceLine(effectiveTilt)
      : pitchOnlyVoiceLine(effectiveTilt);
  const degree = formatBassDegreeLabel(getVoiceDegreeLabel(voiceLine, chord));
  return formatBassDegreeWithDirection(degree, pitchAxisArrowSteps(tilt));
}

/** All bass degree labels for no-tilt position selects (-4..+4 parallel steps). */
export function bassDegreeLabelsForSelect(chord: Chord | null): string[] {
  return Array.from({ length: NO_TILT_POSITION_LEVEL_COUNT }, (_, idx) =>
    getBassDegreeLabelForParallelSteps(
      parallelStepsFromNoTiltPositionLevel(idx),
      chord
    )
  );
}
