/// <reference types="node" />
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFullscreen } from './useFullscreen';

vi.mock('../utils/devicePlatform', () => ({
  isIphone: vi.fn(() => false),
  supportsBrowserFullscreen: vi.fn(() => true),
}));

import { isIphone, supportsBrowserFullscreen } from '../utils/devicePlatform';

describe('useFullscreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isIphone).mockReturnValue(false);
    vi.mocked(supportsBrowserFullscreen).mockReturnValue(true);

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
  });

  it('requests fullscreen when toggled and not on iPhone', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    const { result } = renderHook(() => useFullscreen());

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(result.current.showIosInstallHint).toBe(false);
  });

  it('shows iOS install hint on iPhone instead of requesting fullscreen', async () => {
    vi.mocked(isIphone).mockReturnValue(true);

    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

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
});
