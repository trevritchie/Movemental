import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBodyScrollLock } from './useBodyScrollLock';

describe('useBodyScrollLock', () => {
  afterEach(() => {
    document.documentElement.classList.remove('scroll-locked');
    document.body.classList.remove('scroll-locked');
  });

  it('adds scroll lock classes while active', () => {
    const { unmount } = renderHook(() => useBodyScrollLock(true));

    expect(document.documentElement.classList.contains('scroll-locked')).toBe(
      true
    );
    expect(document.body.classList.contains('scroll-locked')).toBe(true);

    unmount();

    expect(document.documentElement.classList.contains('scroll-locked')).toBe(
      false
    );
    expect(document.body.classList.contains('scroll-locked')).toBe(false);
  });

  it('does not lock scroll when inactive', () => {
    renderHook(() => useBodyScrollLock(false));

    expect(document.documentElement.classList.contains('scroll-locked')).toBe(
      false
    );
    expect(document.body.classList.contains('scroll-locked')).toBe(false);
  });
});
