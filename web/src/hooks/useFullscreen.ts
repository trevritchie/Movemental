/**
 * Browser fullscreen toggle with iOS install-to-homescreen hint fallback.
 */
import { useCallback, useEffect, useState } from 'react';
import { isIphone, supportsBrowserFullscreen } from '../utils/devicePlatform';

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isIphone()) {
      setShowIosInstallHint(true);
      return;
    }
    if (!supportsBrowserFullscreen()) return;

    const root = document.documentElement as FullscreenElement;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen request failed', err);
    }
  }, []);

  const dismissIosInstallHint = useCallback(() => {
    setShowIosInstallHint(false);
  }, []);

  return {
    isFullscreen,
    canFullscreen: supportsBrowserFullscreen() || isIphone(),
    showIosInstallHint,
    toggleFullscreen,
    dismissIosInstallHint,
  };
}
