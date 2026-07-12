import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ORB_PHYSICS_IDLE_FRAMES,
  ORB_PHYSICS_IDLE_SPEED,
  suspendVisualAnimations,
  isVisualAnimationSuspended,
  shouldPauseOrbPhysics,
  initVisualPriorityListeners,
  prefersReducedMotion,
} from './visualPriority';

describe('visualPriority', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.classList.remove('audio-priority-active');
  });

  afterEach(() => {
    initVisualPriorityListeners()();
    vi.useRealTimers();
  });

  it('suspends visual animations for the configured window', () => {
    suspendVisualAnimations(32);
    expect(isVisualAnimationSuspended()).toBe(true);
    expect(document.body.classList.contains('audio-priority-active')).toBe(true);

    vi.advanceTimersByTime(40);
    expect(isVisualAnimationSuspended()).toBe(false);
  });

  it('pauses orb physics when document is hidden', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    const cleanup = initVisualPriorityListeners();
    expect(shouldPauseOrbPhysics()).toBe(true);
    cleanup();
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
  });

  it('pauses orb physics when reduced motion is preferred', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    initVisualPriorityListeners();
    expect(prefersReducedMotion()).toBe(true);
    expect(shouldPauseOrbPhysics()).toBe(true);
  });

  it('exports idle physics tuning constants', () => {
    expect(ORB_PHYSICS_IDLE_FRAMES).toBeGreaterThan(0);
    expect(ORB_PHYSICS_IDLE_SPEED).toBeGreaterThan(0);
  });
});
