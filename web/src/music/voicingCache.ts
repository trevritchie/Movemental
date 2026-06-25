/**
 * Single-entry memo for tilt label voicing (~7 Hz UI updates).
 *
 * Key uses quantized tilt steps (not raw floats) so nearby sensor noise
 * within the same voicing level hits the cache. Invalidated on every chord
 * commit because previousPlayedChord affects elemental resolution.
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

function borrowingKey(state: BorrowingState): string {
  const positions = [1, 2, 3, 4]
    .map((line) => state.circlePositions[line])
    .join('');
  const directions = [1, 2, 3, 4]
    .map((line) => state.borrowingDirections[line] ?? '_')
    .join('');
  const notes = [1, 2, 3, 4]
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
  deterministicElemental: boolean
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
  ].join('|');
}

let lastKey = '';
let lastPitches: number[] = [];

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
    (options.voiceLeadingMode === 'smooth' && isElementalName(chord.name));
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
    deterministicElemental
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

/** Clear memo when chord or settings change outside tilt quantization. */
export function invalidateVoicingCache(): void {
  lastKey = '';
  lastPitches = [];
}
