/// <reference types="node" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const lifecycleMocks = vi.hoisted(() => ({
  handlePageBackground: vi.fn(),
  handlePageForeground: vi.fn().mockResolvedValue(undefined),
  isNativeApp: vi.fn(() => false),
  configure: vi.fn().mockResolvedValue({ active: true }),
  addAudioListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  addAppListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
}));

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    handlePageBackground: lifecycleMocks.handlePageBackground,
    handlePageForeground: lifecycleMocks.handlePageForeground,
  },
}));

vi.mock('../utils/nativePlatform', () => ({
  isNativeApp: lifecycleMocks.isNativeApp,
}));

vi.mock('../utils/nativeAudioSession', () => ({
  NativeAudioSession: {
    configure: lifecycleMocks.configure,
    addListener: lifecycleMocks.addAudioListener,
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: lifecycleMocks.addAppListener,
  },
}));

import { useAudioLifecycle } from './useAudioLifecycle';

describe('useAudioLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lifecycleMocks.isNativeApp.mockReturnValue(false);
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

  it('configures the native audio session and forwards interruptions', async () => {
    lifecycleMocks.isNativeApp.mockReturnValue(true);
    let sessionListener:
      | ((event: { type: string; state?: string; shouldResume?: boolean }) => void)
      | undefined;
    lifecycleMocks.addAudioListener.mockImplementation(
      async (
        _name: string,
        listener: (event: {
          type: string;
          state?: string;
          shouldResume?: boolean;
        }) => void,
      ) => {
        sessionListener = listener;
        return { remove: vi.fn() };
      },
    );

    renderHook(() => useAudioLifecycle());

    await vi.waitFor(() => {
      expect(lifecycleMocks.configure).toHaveBeenCalledTimes(1);
      expect(sessionListener).toBeDefined();
    });

    sessionListener?.({ type: 'interruption', state: 'began' });
    expect(lifecycleMocks.handlePageBackground).toHaveBeenCalledTimes(1);

    sessionListener?.({
      type: 'interruption',
      state: 'ended',
      shouldResume: true,
    });
    expect(lifecycleMocks.handlePageForeground).toHaveBeenCalledTimes(1);
  });
});
