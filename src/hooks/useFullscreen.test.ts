/// <reference types="node" />
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFullscreen } from './useFullscreen';

vi.mock('../utils/devicePlatform', () => ({
  isIphone: vi.fn(() => false),
  supportsBrowserFullscreen: vi.fn(() => true),
}));
vi.mock('../utils/nativePlatform', () => ({
  isNativeApp: vi.fn(() => false),
}));

import { isIphone, supportsBrowserFullscreen } from '../utils/devicePlatform';
import { isNativeApp } from '../utils/nativePlatform';

function mockRequestFullscreen(): ReturnType<typeof vi.fn> {
  const requestFullscreen = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: requestFullscreen,
  });
  return requestFullscreen;
}

describe('useFullscreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isIphone).mockReturnValue(false);
    vi.mocked(supportsBrowserFullscreen).mockReturnValue(true);
    vi.mocked(isNativeApp).mockReturnValue(false);

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
  });

  it('requests fullscreen when toggled and not on iPhone', async () => {
    const requestFullscreen = mockRequestFullscreen();

    const { result } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(result.current.showIosInstallHint).toBe(false);
  });

  it('shows iOS install hint on iPhone instead of requesting fullscreen', async () => {
    vi.mocked(isIphone).mockReturnValue(true);

    const requestFullscreen = mockRequestFullscreen();

    const { result } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(result.current.showIosInstallHint).toBe(true);
  });

  it('exits fullscreen when already active', async () => {
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.documentElement,
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    });

    const { result } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('dismisses the iOS install hint', async () => {
    vi.mocked(isIphone).mockReturnValue(true);

    const { result } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.toggleFullscreen();
    });
    expect(result.current.showIosInstallHint).toBe(true);

    act(() => {
      result.current.dismissIosInstallHint();
    });
    expect(result.current.showIosInstallHint).toBe(false);
  });

  it('reports not fullscreen-capable inside the native shell', () => {
    vi.mocked(isNativeApp).mockReturnValue(true);

    const { result } = renderHook(() => useFullscreen());

    expect(result.current.canFullscreen).toBe(false);
  });

  it('does nothing on toggle inside the native shell, even on iPhone', async () => {
    vi.mocked(isNativeApp).mockReturnValue(true);
    vi.mocked(isIphone).mockReturnValue(true);
    const requestFullscreen = mockRequestFullscreen();

    const { result } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(result.current.showIosInstallHint).toBe(false);
  });
});
