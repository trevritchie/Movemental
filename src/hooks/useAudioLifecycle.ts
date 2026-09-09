/**
 * Page visibility lifecycle for mobile Web Audio (especially iOS home-screen PWAs
 * and the Capacitor native shell).
 *
 * On hide: stop live voices and release the iOS media session.
 * On show: reclaim playback session and resume the Web Audio context so other
 * apps (e.g. Spotify) pause and the app is ready for the next tap.
 *
 * Native AVAudioSession / Android audio focus is owned by NativeAudioSession.
 * This hook only forwards those events into AudioEngine; it does not set
 * session category from JS (see iosMediaChannel.ts).
 */
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { audioEngine } from '../audio/AudioEngine';
import {
  NativeAudioSession,
  type NativeAudioSessionEvent,
} from '../utils/nativeAudioSession';
import { isNativeApp } from '../utils/nativePlatform';

function handleHidden(): void {
  audioEngine.handlePageBackground();
}

function handleVisible(): void {
  void audioEngine.handlePageForeground();
}

function syncDocumentVisibility(): void {
  if (document.visibilityState === 'hidden') {
    handleHidden();
  } else {
    handleVisible();
  }
}

function handleAppActiveChange({ isActive }: { isActive: boolean }): void {
  if (isActive) {
    handleVisible();
  } else {
    handleHidden();
  }
}

function handleNativeAudioSessionEvent(event: NativeAudioSessionEvent): void {
  switch (event.type) {
    case 'interruption':
      if (event.state === 'began') {
        handleHidden();
      } else if (event.state === 'ended' && event.shouldResume !== false) {
        handleVisible();
      }
      return;
    case 'routeChange':
      // Headphones unplugged: stop live voices; do not auto-resume.
      if (event.reason === 'oldDeviceUnavailable') {
        handleHidden();
      }
      return;
  }
}

function retainPluginHandle(
  pending: Promise<PluginListenerHandle>,
  handles: PluginListenerHandle[],
  isCancelled: () => boolean,
): void {
  void pending.then((handle) => {
    if (isCancelled()) {
      void handle.remove();
      return;
    }
    handles.push(handle);
  });
}

function bindNativeAudioLifecycle(
  handles: PluginListenerHandle[],
  isCancelled: () => boolean,
): void {
  void NativeAudioSession.configure().catch(() => undefined);

  retainPluginHandle(
    NativeAudioSession.addListener(
      'audioSessionEvent',
      handleNativeAudioSessionEvent,
    ),
    handles,
    isCancelled,
  );
  retainPluginHandle(
    App.addListener('appStateChange', handleAppActiveChange),
    handles,
    isCancelled,
  );
}

export function useAudioLifecycle(): void {
  useEffect(() => {
    document.addEventListener('visibilitychange', syncDocumentVisibility);
    window.addEventListener('pagehide', handleHidden);
    window.addEventListener('pageshow', handleVisible);

    const nativeHandles: PluginListenerHandle[] = [];
    let cancelled = false;
    if (isNativeApp()) {
      bindNativeAudioLifecycle(nativeHandles, () => cancelled);
    }

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', syncDocumentVisibility);
      window.removeEventListener('pagehide', handleHidden);
      window.removeEventListener('pageshow', handleVisible);
      nativeHandles.forEach((handle) => {
        void handle.remove();
      });
    };
  }, []);
}
