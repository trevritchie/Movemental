import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  armNoTiltRevoiceSuppress,
  consumeNoTiltRevoiceSuppress,
  createNoTiltRevoiceSuppressState,
} from './noTiltRevoiceSuppress';

describe('noTiltRevoiceSuppress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('consumeIfArmed skips once then allows the next effect', () => {
    const state = createNoTiltRevoiceSuppressState();
    armNoTiltRevoiceSuppress(state);
    expect(consumeNoTiltRevoiceSuppress(state)).toBe(true);
    expect(consumeNoTiltRevoiceSuppress(state)).toBe(false);
  });

  it('fallback timeout consumes an unused arm so the next effect is not skipped', () => {
    const state = createNoTiltRevoiceSuppressState();
    armNoTiltRevoiceSuppress(state);
    expect(state.generation).toBe(1);
    expect(state.consumed).toBe(0);

    vi.runAllTimers();

    expect(state.consumed).toBe(1);
    expect(consumeNoTiltRevoiceSuppress(state)).toBe(false);
  });

  it('effect consume before timeout leaves the fallback as a no-op', () => {
    const state = createNoTiltRevoiceSuppressState();
    armNoTiltRevoiceSuppress(state);
    expect(consumeNoTiltRevoiceSuppress(state)).toBe(true);

    vi.runAllTimers();

    expect(state.consumed).toBe(1);
    expect(consumeNoTiltRevoiceSuppress(state)).toBe(false);
  });
});
