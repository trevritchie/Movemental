import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const lifecycleMocks = vi.hoisted(() => ({
  handlePageBackground: vi.fn(),
  handlePageForeground: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    handlePageBackground: lifecycleMocks.handlePageBackground,
    handlePageForeground: lifecycleMocks.handlePageForeground,
  },
}));

import { useAudioLifecycle } from './useAudioLifecycle';

describe('useAudioLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls background teardown when the page becomes hidden', () => {
    renderHook(() => useAudioLifecycle());

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(lifecycleMocks.handlePageBackground).toHaveBeenCalledTimes(1);
    expect(lifecycleMocks.handlePageForeground).not.toHaveBeenCalled();
  });

  it('calls foreground resume when the page becomes visible', () => {
    renderHook(() => useAudioLifecycle());

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(lifecycleMocks.handlePageForeground).toHaveBeenCalledTimes(1);
  });

  it('handles pagehide and pageshow as iOS PWA fallbacks', () => {
    renderHook(() => useAudioLifecycle());

    window.dispatchEvent(new Event('pagehide'));
    expect(lifecycleMocks.handlePageBackground).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('pageshow'));
    expect(lifecycleMocks.handlePageForeground).toHaveBeenCalledTimes(1);
  });
});
