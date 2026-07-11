import { describe, it, expect, beforeEach } from 'vitest';
import { isPageInteractiveForAudio } from './pageInteraction';

describe('pageInteraction', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
  });

  it('allows audio preview when the page is visible', () => {
    expect(isPageInteractiveForAudio()).toBe(true);
  });

  it('blocks audio preview when the page is hidden', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    expect(isPageInteractiveForAudio()).toBe(false);
  });
});
