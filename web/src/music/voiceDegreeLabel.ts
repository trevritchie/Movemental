/**
 * Bass degree labels for the IN THE BASS readout.
 *
 * Tilt mode: derive the label from the lowest *sounded* pitch (contrary anchor,
 * both roll and pitch axes). Static mode: position dropdown uses pitch-only
 * indices 0..3 via getBassDegreeLabelForPositionIndex.
 */
import type { Chord } from './ChordManager';
import { borrowingLogic, type BorrowingState } from './BorrowingLogic';
import {
  parallelLevelFromTilt,
  positionLabelIndexFromParallelSteps,
  type TiltSample,
} from './TiltVoicingEngine';
import { getCachedTiltVoicedPitches } from './voicingCache';

export type BassDegreeLabelVariant = 'mobile' | 'desktop';
export type VoiceLine = 1 | 2 | 3 | 4;

export const TILT_BASS_DEGREE_MOBILE_MAX_LABEL = 'Root';
export const TILT_BASS_DEGREE_DESKTOP_MAX_LABEL = 'Root Bass';

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
  variant: BassDegreeLabelVariant
): string {
  if (variant === 'desktop') {
    return `${degree} Bass`;
  }
  return degree;
}

export function getBassDegreeLabelForPositionIndex(
  positionIndex: number,
  chord: Chord | null,
  variant: BassDegreeLabelVariant = 'mobile'
): string {
  const clampedIndex = Math.max(0, Math.min(3, positionIndex));
  const voiceLine = (clampedIndex + 1) as VoiceLine;
  const degree = getVoiceDegreeLabel(voiceLine, chord);
  return formatBassDegreeLabel(degree, variant);
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
  const idx = positionLabelIndexFromParallelSteps(steps);
  return (Math.max(0, Math.min(3, idx)) + 1) as VoiceLine;
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
  const voiceLine: VoiceLine =
    context && chord
      ? resolveTiltBassVoiceLine(tilt, chord, context) ??
        pitchOnlyVoiceLine(tilt)
      : pitchOnlyVoiceLine(tilt);
  const degree = getVoiceDegreeLabel(voiceLine, chord);
  return formatBassDegreeLabel(degree, variant);
}

/** All four bass degree labels for static position selects. */
export function bassDegreeLabelsForSelect(
  chord: Chord | null,
  variant: BassDegreeLabelVariant
): string[] {
  return [0, 1, 2, 3].map((idx) =>
    getBassDegreeLabelForPositionIndex(idx, chord, variant)
  );
}
