/**
 * Page visibility lifecycle for mobile Web Audio (especially iOS home-screen PWAs).
 *
 * On hide: stop live voices and release the iOS media session.
 * On show: reclaim playback session and resume the Web Audio context so other
 * apps (e.g. Spotify) pause and the app is ready for the next tap.
 */
import { useEffect } from 'react';
import { audioEngine } from '../audio/AudioEngine';

function handleHidden(): void {
  audioEngine.handlePageBackground();
}

function handleVisible(): void {
  void audioEngine.handlePageForeground();
}

export function useAudioLifecycle(): void {
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleHidden();
      } else {
        handleVisible();
      }
    };

    const onPageHide = () => {
      handleHidden();
    };

    const onPageShow = () => {
      handleVisible();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);
}
