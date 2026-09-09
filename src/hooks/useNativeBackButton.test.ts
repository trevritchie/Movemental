/// <reference types="node" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isNativeAndroid: vi.fn(() => false),
  addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  minimizeApp: vi.fn(),
}));

vi.mock('../utils/nativePlatform', () => ({
  isNativeAndroid: mocks.isNativeAndroid,
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: mocks.addListener,
    minimizeApp: mocks.minimizeApp,
  },
}));

import { useNativeBackButton } from './useNativeBackButton';

describe('useNativeBackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isNativeAndroid.mockReturnValue(false);
    document.body.innerHTML = '';
  });

  it('does not register a listener on web or iOS', () => {
    renderHook(() => useNativeBackButton());
    expect(mocks.addListener).not.toHaveBeenCalled();
  });

  it('minimizes the Android app when no overlay is open', async () => {
    mocks.isNativeAndroid.mockReturnValue(true);
    let backHandler: (() => void) | undefined;
    mocks.addListener.mockImplementation(
      async (_event: string, listener: () => void) => {
        backHandler = listener;
        return { remove: vi.fn() };
      },
    );

    renderHook(() => useNativeBackButton());
    await vi.waitFor(() => {
      expect(backHandler).toBeDefined();
    });

    backHandler?.();
    expect(mocks.minimizeApp).toHaveBeenCalledTimes(1);
  });

  it('closes an open dialog instead of minimizing', async () => {
    mocks.isNativeAndroid.mockReturnValue(true);
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    const close = vi.fn();
    dialog.close = close;
    document.body.appendChild(dialog);

    let backHandler: (() => void) | undefined;
    mocks.addListener.mockImplementation(
      async (_event: string, listener: () => void) => {
        backHandler = listener;
        return { remove: vi.fn() };
      },
    );

    renderHook(() => useNativeBackButton());
    await vi.waitFor(() => {
      expect(backHandler).toBeDefined();
    });

    backHandler?.();
    expect(close).toHaveBeenCalled();
    expect(mocks.minimizeApp).not.toHaveBeenCalled();
  });
});
