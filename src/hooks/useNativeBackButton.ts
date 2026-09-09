/**
 * Android system back button: dismiss open UI first, then minimize the app.
 * iOS has no system back button; this hook is a no-op there and on web.
 */
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { isNativeAndroid } from '../utils/nativePlatform';

function dismissOpenDialog(dialog: HTMLDialogElement): void {
  const cancelEvent = new Event('cancel', { bubbles: true, cancelable: true });
  const allowed = dialog.dispatchEvent(cancelEvent);
  if (allowed && dialog.open) {
    dialog.close();
  }
}

function dismissNativeOverlays(): boolean {
  const openDialog = document.querySelector('dialog[open]');
  if (openDialog instanceof HTMLDialogElement) {
    dismissOpenDialog(openDialog);
    return true;
  }

  const reviewDismiss = document.querySelector(
    '[aria-label="Dismiss recording review"]',
  );
  if (reviewDismiss instanceof HTMLElement) {
    reviewDismiss.click();
    return true;
  }

  return false;
}

export function useNativeBackButton(): void {
  useEffect(() => {
    if (!isNativeAndroid()) return;

    let handle: PluginListenerHandle | undefined;
    let cancelled = false;
    void App.addListener('backButton', () => {
      if (!dismissNativeOverlays()) {
        void App.minimizeApp();
      }
    }).then((listener) => {
      if (cancelled) {
        void listener.remove();
        return;
      }
      handle = listener;
    });

    return () => {
      cancelled = true;
      void handle?.remove();
    };
  }, []);
}
