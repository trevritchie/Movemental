/**
 * Bass degree labels for the IN THE BASS readout.
 *
 * Tilt mode: derive the label from the lowest *sounded* pitch (contrary anchor,
 * both roll and pitch axes). Static mode: position dropdown uses signed parallel
 * steps via getBassDegreeLabelForParallelSteps.
 */
import type { Chord } from './ChordManager';
import { borrowingLogic, type BorrowingState } from './BorrowingLogic';
import {
  parallelLevelFromTilt,
  parallelStepsFromStaticPositionLevel,
  positionLabelIndexFromParallelSteps,
  STATIC_POSITION_LEVEL_COUNT,
  type TiltSample,
} from './TiltVoicingEngine';
import { getCachedTiltVoicedPitches } from './voicingCache';

export type BassDegreeLabelVariant = 'mobile' | 'desktop';
export type VoiceLine = 1 | 2 | 3 | 4;

export const TILT_BASS_DEGREE_MOBILE_MAX_LABEL = '\u2191 Root';
export const TILT_BASS_DEGREE_DESKTOP_MAX_LABEL = TILT_BASS_DEGREE_MOBILE_MAX_LABEL;

const DEFAULT_FOURTH_DEGREE = '6th';

export interface TiltBassLabelContext {
  tonalCenter: number;
  octaveRange: number;
  borrowingState: BorrowingState;
  previousChord?: Chord | null;
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

export function formatBassDegreeLabel(
  degree: string,
  _variant: BassDegreeLabelVariant = 'mobile'
): string {
  return degree;
}

/** Prefix ↑ or ↓ when parallel position is above or below 1st. */
export function formatBassDegreeWithDirection(
  degree: string,
  parallelSteps: number
): string {
  if (parallelSteps > 0) {
    return `\u2191 ${degree}`;
  }
  if (parallelSteps < 0) {
    return `\u2193 ${degree}`;
  }
  return degree;
}

export function voiceLineForParallelSteps(parallelSteps: number): VoiceLine {
  const idx = positionLabelIndexFromParallelSteps(parallelSteps);
  return (Math.max(0, Math.min(3, idx)) + 1) as VoiceLine;
}

export function getBassDegreeLabelForParallelSteps(
  parallelSteps: number,
  chord: Chord | null,
  variant: BassDegreeLabelVariant = 'mobile'
): string {
  const voiceLine = voiceLineForParallelSteps(parallelSteps);
  const degree = getVoiceDegreeLabel(voiceLine, chord);
  return formatBassDegreeWithDirection(
    formatBassDegreeLabel(degree, variant),
    parallelSteps
  );
}

/** @deprecated Use getBassDegreeLabelForParallelSteps with unsigned steps 0..3. */
export function getBassDegreeLabelForPositionIndex(
  positionIndex: number,
  chord: Chord | null,
  variant: BassDegreeLabelVariant = 'mobile'
): string {
  const clampedIndex = Math.max(0, Math.min(3, positionIndex));
  return getBassDegreeLabelForParallelSteps(clampedIndex, chord, variant);
}

function voiceLineForLowestPitch(
  voiced: number[],
  pitchStructure: (number | null)[],
  chord: Chord
): VoiceLine | null {
  if (voiced.length === 0) {
    return null;
  }

  const lowestPc = ((Math.min(...voiced) % 12) + 12) % 12;
  const mapping = borrowingLogic.getRootPositionMapping(chord);

  // Map pitch class back to chord line 1-4. If borrowing collapsed two lines
  // to the same PC, the first matching line wins.
  for (let line = 1; line <= 4; line++) {
    const slotIdx = mapping[line];
    const pitch = pitchStructure[slotIdx];
    if (pitch === null) {
      continue;
    }
    const pc = ((pitch % 12) + 12) % 12;
    if (pc === lowestPc) {
      return line as VoiceLine;
    }
  }

  return null;
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

  const voiced = getCachedTiltVoicedPitches(
    chord,
    context.borrowingState,
    tilt,
    context.tonalCenter,
    context.octaveRange,
    { anchor: 'contrary', previousChord: context.previousChord }
  );
  const structure = borrowingLogic.prepareVoicingInput(
    chord,
    context.borrowingState
  ).pitchStructure;
  const line = voiceLineForLowestPitch(voiced, structure, chord);
  return line ?? pitchOnlyVoiceLine(tilt);
}

export function tiltBassDegreeLabel(
  tilt: TiltSample,
  chord: Chord | null,
  variant: BassDegreeLabelVariant = 'mobile',
  context?: TiltBassLabelContext
): string {
  const parallelSteps = parallelLevelFromTilt(tilt);
  const voiceLine: VoiceLine =
    context && chord
      ? resolveTiltBassVoiceLine(tilt, chord, context) ??
        pitchOnlyVoiceLine(tilt)
      : pitchOnlyVoiceLine(tilt);
  const degree = formatBassDegreeLabel(
    getVoiceDegreeLabel(voiceLine, chord),
    variant
  );
  return formatBassDegreeWithDirection(degree, parallelSteps);
}

/** All bass degree labels for static position selects (-4..+4 parallel steps). */
export function bassDegreeLabelsForSelect(
  chord: Chord | null,
  variant: BassDegreeLabelVariant
): string[] {
  return Array.from({ length: STATIC_POSITION_LEVEL_COUNT }, (_, idx) =>
    getBassDegreeLabelForParallelSteps(
      parallelStepsFromStaticPositionLevel(idx),
      chord,
      variant
    )
  );
}
