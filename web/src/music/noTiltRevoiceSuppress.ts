/**
 * One-shot suppress for the ChordContext no-tilt re-voice effect after
 * pointer commits. Uses a generation counter so a stuck arm (no deferred
 * level flush, effect never runs) cannot skip the next legitimate re-voice.
 *
 * arm() bumps generation and schedules a macrotask fallback that marks the
 * generation consumed if the effect did not. consumeIfArmed() returns true
 * when this effect run should skip playAndDisplayChord.
 */

export interface NoTiltRevoiceSuppressState {
  generation: number;
  consumed: number;
}

export function createNoTiltRevoiceSuppressState(): NoTiltRevoiceSuppressState {
  return { generation: 0, consumed: 0 };
}

export function armNoTiltRevoiceSuppress(
  state: NoTiltRevoiceSuppressState,
): void {
  state.generation += 1;
  const armed = state.generation;
  if (typeof window === 'undefined') {
    return;
  }
  // After deferred microtask setStates and React passive effects for this
  // turn: if the effect never consumed this arm, mark it consumed so the
  // next real control change is not skipped.
  window.setTimeout(() => {
    if (state.generation === armed && state.consumed < armed) {
      state.consumed = armed;
    }
  }, 0);
}

/** True when the re-voice effect should skip this run. */
export function consumeNoTiltRevoiceSuppress(
  state: NoTiltRevoiceSuppressState,
): boolean {
  if (state.generation > state.consumed) {
    state.consumed = state.generation;
    return true;
  }
  return false;
}
