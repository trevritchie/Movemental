/**
 * Pure voicing path shared by playback and UI labels.
 *
 * Order: borrowing structure -> ladder voicing (TiltVoicingEngine) ->
 * post-filter mutes. Elemental chords need a resolved homeMidi anchor;
 * callers that already resolved once can pass `elemental` to avoid duplicate work.
 */
import type { Chord } from './ChordManager';
import { borrowingLogic, type BorrowingState } from './BorrowingLogic';
import {
  computeTiltVoicing,
  type TiltSample,
  type TiltVoicingAnchor,
} from './TiltVoicingEngine';
import { isElementalName, resolveElementalPlayback } from './elementalRoot';

export interface ElementalPlaybackResolution {
  rootPitchClass: number;
  homeMidi: number;
}

export interface ComputeTiltVoicedPitchesOptions {
  anchor?: TiltVoicingAnchor;
  previousChord?: Chord | null;
  /** When set, skips a second resolveElementalPlayback call. */
  elemental?: ElementalPlaybackResolution;
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
  const { anchor = 'contrary', previousChord = null, elemental } = options;
  const { pitchStructure, mutedPitchClasses } =
    borrowingLogic.prepareVoicingInput(chord, borrowingState);

  let voiced: number[];
  if (isElementalName(chord.name)) {
    const resolved =
      elemental ??
      resolveElementalPlayback(
        chord,
        tonalCenter,
        octaveRange,
        previousChord
      );
    voiced = computeTiltVoicing(
      pitchStructure,
      resolved.rootPitchClass,
      tilt,
      octaveRange,
      tonalCenter,
      resolved.homeMidi,
      { anchor }
    );
  } else {
    const rootPitchClass = chord.pitches[chord.rootPositionIndex] % 12;
    voiced = computeTiltVoicing(
      pitchStructure,
      rootPitchClass,
      tilt,
      octaveRange,
      tonalCenter,
      undefined,
      { anchor }
    );
  }

  return borrowingLogic.filterVoicingMutes(voiced, mutedPitchClasses);
}
