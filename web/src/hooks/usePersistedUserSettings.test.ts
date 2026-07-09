import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistedUserSettings } from './usePersistedUserSettings';
import {
  getDefaultSoundDesignSettings,
  DEFAULT_USER_SETTINGS,
} from '../settings/userSettingsSchema';
import { STORAGE_KEY } from '../settings/userSettingsStorage';

describe('usePersistedUserSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips the initial save on mount', () => {
    const snapshot = {
      general: DEFAULT_USER_SETTINGS.general,
      voiceLeading: DEFAULT_USER_SETTINGS.voiceLeading,
      voiceBorrowing: DEFAULT_USER_SETTINGS.voiceBorrowing,
      soundDesign: getDefaultSoundDesignSettings(),
    };

    const { rerender } = renderHook(
      ({ value }) => usePersistedUserSettings(value),
      { initialProps: { value: snapshot } }
    );

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    rerender({
      value: {
        ...snapshot,
        general: { ...snapshot.general, tonalCenter: 5 },
      },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(localStorage.getItem(STORAGE_KEY)).toContain('"tonalCenter":5');
  });

  it('debounces rapid changes into one write', () => {
    const snapshot = {
      general: DEFAULT_USER_SETTINGS.general,
      voiceLeading: DEFAULT_USER_SETTINGS.voiceLeading,
      voiceBorrowing: DEFAULT_USER_SETTINGS.voiceBorrowing,
      soundDesign: getDefaultSoundDesignSettings(),
    };

    const { rerender } = renderHook(
      ({ value }) => usePersistedUserSettings(value),
      { initialProps: { value: snapshot } }
    );

    rerender({
      value: {
        ...snapshot,
        general: { ...snapshot.general, tonalCenter: 1 },
      },
    });
    rerender({
      value: {
        ...snapshot,
        general: { ...snapshot.general, tonalCenter: 2 },
      },
    });
    rerender({
      value: {
        ...snapshot,
        general: { ...snapshot.general, tonalCenter: 3 },
      },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(localStorage.getItem(STORAGE_KEY)).toContain('"tonalCenter":3');
  });
});
