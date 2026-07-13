/**
 * Debounced write-through from live settings state to localStorage.
 */
import { useEffect, useRef } from 'react';
import {
  buildSettingsSnapshot,
  type PersistedUserSettings,
} from '../settings/userSettingsSchema';
import { saveUserSettings } from '../settings/userSettingsStorage';

const SAVE_DEBOUNCE_MS = 300;

export function usePersistedUserSettings(
  snapshot: Omit<PersistedUserSettings, 'version'>
): void {
  const hasHydratedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveUserSettings(buildSettingsSnapshot(snapshot));
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [snapshot]);
}
