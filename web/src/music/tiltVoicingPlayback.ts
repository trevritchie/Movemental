/**
 * Pure voicing path shared by playback and UI labels.
 *
 * Neutral ladder voicing is computed once per anchor (tap or settings change).
 * Borrowing and mutes are overlays on that MIDI spread, not tone-cycle rebuilds.
 */
import type { Chord } from './ChordManager';
import {
  borrowingLogic,
  type BorrowingState,
} from './BorrowingLogic';
import {
  computeTiltVoicing,
  type TiltSample,
  type TiltVoicingAnchor,
} from './TiltVoicingEngine';
import {
  isElementalName,
  resolveDeterministicElementalPlayback,
  resolveElementalPlayback,
} from './elementalRoot';

export interface ElementalPlaybackResolution {
  rootPitchClass: number;
  homeMidi: number;
}

export interface ComputeTiltVoicedPitchesOptions {
  anchor?: TiltVoicingAnchor;
  previousChord?: Chord | null;
  /** When set, skips a second resolveElementalPlayback call. */
  elemental?: ElementalPlaybackResolution;
  /** When set, skip ladder voicing and apply borrow/mute overlays only. */
  neutralVoicing?: number[];
  /** Smooth mode: ignore previousChord for elemental root/register. */
  deterministicElemental?: boolean;
}

function resolveElementalForVoicing(
  chord: Chord,
  tonalCenter: number,
  octaveRange: number,
  options: {
    elemental?: ElementalPlaybackResolution;
    deterministicElemental?: boolean;
  }
): ElementalPlaybackResolution & { chord: Chord } {
  if (options.elemental) {
    return { ...options.elemental, chord };
  }
  if (options.deterministicElemental) {
    return resolveDeterministicElementalPlayback(
      chord,
      tonalCenter,
      octaveRange
    );
  }
  return resolveElementalPlayback(chord, tonalCenter, octaveRange);
}

function neutralPitchStructure(chord: Chord): (number | null)[] {
  const structure: (number | null)[] = [null, null, null, null];
  for (let i = 0; i < chord.pitches.length && i < 4; i++) {
    structure[i] = chord.pitches[i];
  }
  return structure;
}

export interface VoicingRootResolution {
  pitchStructure: (number | null)[];
  rootPitchClass: number;
  homeMidi?: number;
}

/**
 * Resolve tone-cycle root and optional homeMidi for ladder voicing.
 */
export function resolveVoicingRoot(
  chord: Chord,
  tonalCenter: number,
  octaveRange: number,
  elemental?: ElementalPlaybackResolution,
  deterministicElemental?: boolean
): VoicingRootResolution {
  const pitchStructure = neutralPitchStructure(chord);

  if (isElementalName(chord.name)) {
    const resolved = resolveElementalForVoicing(
      chord,
      tonalCenter,
      octaveRange,
      { elemental, deterministicElemental }
    );
    return {
      pitchStructure,
      rootPitchClass: resolved.rootPitchClass,
      homeMidi: resolved.homeMidi,
    };
  }

  return {
    pitchStructure,
    rootPitchClass: chord.pitches[chord.rootPositionIndex] % 12,
  };
}

/**
 * Full ladder voicing with all voices on and no borrowing (anchor base).
 */
export function computeNeutralTiltVoicing(
  chord: Chord,
  tilt: TiltSample,
  tonalCenter: number,
  octaveRange: number,
  options: ComputeTiltVoicedPitchesOptions = {}
): number[] {
  const {
    anchor = 'contrary',
    elemental,
    deterministicElemental,
  } = options;
  const pitchStructure = neutralPitchStructure(chord);

  if (isElementalName(chord.name)) {
    const resolved = resolveElementalForVoicing(
      chord,
      tonalCenter,
      octaveRange,
      { elemental, deterministicElemental }
    );
    return computeTiltVoicing(
      pitchStructure,
      resolved.rootPitchClass,
      tilt,
      octaveRange,
      tonalCenter,
      resolved.homeMidi,
      { anchor }
    );
  }

  const rootPitchClass = chord.pitches[chord.rootPositionIndex] % 12;
  return computeTiltVoicing(
    pitchStructure,
    rootPitchClass,
    tilt,
    octaveRange,
    tonalCenter,
    undefined,
    { anchor }
  );
}

/**
 * Apply borrow/mute overlays to a precomputed neutral voicing.
 */
export function applyVoicingOverlays(
  neutralVoicing: number[],
  chord: Chord,
  borrowingState: BorrowingState
): number[] {
  return borrowingLogic.applyVoicingOverlays(
    neutralVoicing,
    chord,
    borrowingState
  );
}

/**
 * Compute voiced MIDI pitches for a chord at a tilt sample, mirroring playback.
 */
export function computeTiltVoicedPitches(
  chord: Chord,
  borrowingState: BorrowingState,
  tilt: TiltSample,
  tonalCenter: number,
  octaveRange: number,
  options: ComputeTiltVoicedPitchesOptions = {}
): number[] {
  const neutral =
    options.neutralVoicing ??
    computeNeutralTiltVoicing(
      chord,
      tilt,
      tonalCenter,
      octaveRange,
      options
    );

  return applyVoicingOverlays(neutral, chord, borrowingState);
}
