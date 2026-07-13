/// <reference types="node" />
import { describe, it, expect, afterEach, vi } from 'vitest';
import { isIphone, supportsBrowserFullscreen } from './devicePlatform';

describe('devicePlatform', () => {
  const originalUserAgent = navigator.userAgent;

  function stubUserAgent(userAgent: string) {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent,
    });
  }

  afterEach(() => {
    stubUserAgent(originalUserAgent);
  });

  describe('isIphone', () => {
    it('returns true for iPhone user agents', () => {
      stubUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
      );
      expect(isIphone()).toBe(true);
    });

    it('returns false for iPad user agents', () => {
      stubUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)');
      expect(isIphone()).toBe(false);
    });

    it('returns false for Android user agents', () => {
      stubUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8)');
      expect(isIphone()).toBe(false);
    });
  });

  describe('supportsBrowserFullscreen', () => {
    it('returns true when requestFullscreen is available', () => {
      const requestFullscreen = vi.fn();
      vi.stubGlobal('document', {
        ...document,
        fullscreenEnabled: true,
        documentElement: { requestFullscreen },
      });
      expect(supportsBrowserFullscreen()).toBe(true);
    });

    it('returns false when fullscreen is explicitly disabled', () => {
      vi.stubGlobal('document', {
        ...document,
        fullscreenEnabled: false,
        documentElement: { requestFullscreen: vi.fn() },
      });
      expect(supportsBrowserFullscreen()).toBe(false);
    });
  });
});
