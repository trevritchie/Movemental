/**
 * Single-entry memo for tilt label voicing (~7 Hz UI updates).
 *
 * Key uses quantized tilt steps (not raw floats) so nearby sensor noise
 * within the same voicing level hits the cache. Commit invalidation is
 * selective: only when chord, borrowing, or voice-leading mode changes.
 */
import type { VoiceLeadingMode } from '../context/types';
import { isElementalName } from './elementalRoot';
import type { BorrowingState } from './BorrowingLogic';
import type { Chord } from './ChordManager';
import {
  mapTiltToPositions,
  parallelLevelFromTilt,
  type TiltSample,
  type TiltVoicingAnchor,
} from './TiltVoicingEngine';
import {
  computeTiltVoicedPitches,
  type ElementalPlaybackResolution,
} from './tiltVoicingPlayback';

const BORROWING_LINES = [1, 2, 3, 4] as const;

function borrowingKey(state: BorrowingState): string {
  const positions = BORROWING_LINES
    .map((line) => state.circlePositions[line])
    .join('');
  const directions = BORROWING_LINES
    .map((line) => state.borrowingDirections[line] ?? '_')
    .join('');
  const notes = BORROWING_LINES
    .map((line) => state.noteStates[line])
    .join('');
  return `${state.active ? 1 : 0}:${positions}:${directions}:${notes}`;
}

function cacheKey(
  chord: Chord,
  state: BorrowingState,
  tilt: TiltSample,
  tonalCenter: number,
  octaveRange: number,
  anchor: TiltVoicingAnchor,
  previousChordName: string | null,
  voiceLeadingMode: VoiceLeadingMode | undefined,
  smoothBaseParallel: number | undefined,
  lastTapTilt: TiltSample | undefined,
  deterministicElemental: boolean,
  elemental?: ElementalPlaybackResolution
): string {
  const { inputSteps, parallelSteps } = mapTiltToPositions(tilt);
  const lastTapParallel =
    lastTapTilt !== undefined ? parallelLevelFromTilt(lastTapTilt) : '';
  return [
    chord.name,
    chord.rootPositionIndex,
    borrowingKey(state),
    inputSteps,
    parallelSteps,
    tonalCenter,
    octaveRange,
    anchor,
    deterministicElemental ? '' : (previousChordName ?? ''),
    voiceLeadingMode ?? '',
    smoothBaseParallel ?? '',
    lastTapParallel,
    deterministicElemental ? 'detElem' : '',
    elemental?.rootPitchClass ?? '',
    elemental?.homeMidi ?? '',
  ].join('|');
}

let lastKey = '';
let lastPitches: number[] = [];
let lastCommitInvalidationKey = '';

/**
 * Memoize voiced pitches for UI readouts (tilt label updates ~7 Hz).
 * Playback always calls computeTiltVoicedPitches directly.
 */
export function getCachedTiltVoicedPitches(
  chord: Chord,
  borrowingState: BorrowingState,
  tilt: TiltSample,
  tonalCenter: number,
  octaveRange: number,
  options: {
    anchor?: TiltVoicingAnchor;
    previousChord?: Chord | null;
    elemental?: ElementalPlaybackResolution;
    voiceLeadingMode?: VoiceLeadingMode;
    smoothBaseParallel?: number;
    lastTapTilt?: TiltSample;
    deterministicElemental?: boolean;
  } = {}
): number[] {
  const anchor = options.anchor ?? 'contrary';
  const deterministicElemental =
    options.deterministicElemental ??
    (options.voiceLeadingMode === 'smooth' &&
      isElementalName(chord.name) &&
      !options.elemental);
  const key = cacheKey(
    chord,
    borrowingState,
    tilt,
    tonalCenter,
    octaveRange,
    anchor,
    options.previousChord?.name ?? null,
    options.voiceLeadingMode,
    options.smoothBaseParallel,
    options.lastTapTilt,
    deterministicElemental,
    options.elemental
  );
  if (key === lastKey) {
    return lastPitches;
  }
  lastPitches = computeTiltVoicedPitches(
    chord,
    borrowingState,
    tilt,
    tonalCenter,
    octaveRange,
    { ...options, deterministicElemental }
  );
  lastKey = key;
  return lastPitches;
}

/** Clear memo when chord, borrowing, or voice-leading mode changes on commit. */
export function invalidateVoicingCacheForCommit(
  chordName: string,
  borrowingState: BorrowingState,
  voiceLeadingMode: VoiceLeadingMode | undefined
): void {
  const key = `${chordName}|${borrowingKey(borrowingState)}|${
    voiceLeadingMode ?? ''
  }`;
  if (key === lastCommitInvalidationKey) {
    return;
  }
  lastCommitInvalidationKey = key;
  lastKey = '';
  lastPitches = [];
}

/** Clear memo when chord or settings change outside tilt quantization. */
export function invalidateVoicingCache(): void {
  lastKey = '';
  lastPitches = [];
  lastCommitInvalidationKey = '';
}
