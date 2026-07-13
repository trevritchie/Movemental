import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  shouldPauseOrbPhysics,
  initVisualPriorityListeners,
  prefersReducedMotion,
  isDocumentHidden,
} from './visualPriority';

describe('visualPriority', () => {
  afterEach(() => {
    initVisualPriorityListeners()();
  });

  it('does not pause orb physics by default when document is visible', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    initVisualPriorityListeners();
    expect(isDocumentHidden()).toBe(false);
    expect(shouldPauseOrbPhysics()).toBe(false);
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

  it('does not export chord-tap suspend helpers', async () => {
    const mod = await import('./visualPriority');
    expect('suspendVisualAnimations' in mod).toBe(false);
    expect('VISUAL_SUSPEND_MS' in mod).toBe(false);
  });
});
