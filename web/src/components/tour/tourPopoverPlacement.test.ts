/// <reference types="node" />
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { popoverStyle } from './tourPopoverPlacement';

describe('popoverStyle', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 844,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    });
  });

  it('centers popover for a large diagram target on phone', () => {
    const style = popoverStyle({
      top: 0,
      left: 0,
      width: 390,
      height: 520,
    });

    expect(style.top).toBeTypeOf('number');
    expect(style.top as number).toBeGreaterThanOrEqual(16);
    expect(style.top as number).toBeLessThanOrEqual(844 - 240 - 16);
    expect(style.left).toBe(35);
  });

  it('keeps popover below a small target when space allows', () => {
    const style = popoverStyle({
      top: 40,
      left: 300,
      width: 48,
      height: 48,
    });

    expect(style.top).toBe(100);
  });
});
