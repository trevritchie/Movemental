/**
 * Single-entry memo for tilt label voicing (~7 Hz UI updates).
 *
 * Key uses quantized tilt steps (not raw floats) so nearby sensor noise
 * within the same voicing level hits the cache. Invalidated on every chord
 * commit because previousPlayedChord affects elemental resolution.
 */
import type { BorrowingState } from './BorrowingLogic';
import type { Chord } from './ChordManager';
import {
  mapTiltToPositions,
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
  previousChordName: string | null
): string {
  const { inputSteps, parallelSteps } = mapTiltToPositions(tilt);
  return [
    chord.name,
    chord.rootPositionIndex,
    borrowingKey(state),
    inputSteps,
    parallelSteps,
    tonalCenter,
    octaveRange,
    anchor,
    previousChordName ?? '',
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
  } = {}
): number[] {
  const anchor = options.anchor ?? 'contrary';
  const key = cacheKey(
    chord,
    borrowingState,
    tilt,
    tonalCenter,
    octaveRange,
    anchor,
    options.previousChord?.name ?? null
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
    options
  );
  lastKey = key;
  return lastPitches;
}

/** Clear memo when chord or settings change outside tilt quantization. */
export function invalidateVoicingCache(): void {
  lastKey = '';
  lastPitches = [];
}
