import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ChordProvider, useChordContext } from './ChordContext';
import { DEFAULT_USER_SETTINGS } from '../settings/userSettingsSchema';
import { saveUserSettings, STORAGE_KEY } from '../settings/userSettingsStorage';

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    setChorusWet: vi.fn(),
    setDelayWet: vi.fn(),
    setReverbWet: vi.fn(),
    setEnvelope: vi.fn(),
    releaseActiveNotes: vi.fn(),
    playChord: vi.fn(),
    startDrone: vi.fn(),
    stopDrone: vi.fn(),
    startContext: vi.fn(),
  },
}));

vi.mock('../hooks/useDeviceTilt', () => ({
  useDeviceTilt: () => ({
    status: 'unavailable',
    tilt: { x: 0, y: 0, z: 0 },
    rawTiltRef: { current: { x: 0, y: 0, z: 0 } },
    requestPermission: vi.fn(),
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <ChordProvider>{children}</ChordProvider>;
}

describe('ChordProvider persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes from saved settings including instrument preset', () => {
    saveUserSettings({
      ...DEFAULT_USER_SETTINGS,
      general: {
        tonalCenter: 4,
        octaveRange: 3,
        playStyle: 'click_and_hold',
      },
      voiceLeading: { mode: 'root_position' },
      soundDesign: {
        ...DEFAULT_USER_SETTINGS.soundDesign,
        synthPresetId: 'warmPad',
        eqProfileId: 'flat',
      },
    });

    const { result } = renderHook(() => useChordContext(), { wrapper });

    expect(result.current.tonalCenter).toBe(4);
    expect(result.current.octaveRange).toBe(3);
    expect(result.current.playStyle).toBe('click_and_hold');
    expect(result.current.voiceLeadingMode).toBe('root_position');
    expect(result.current.synthPresetId).toBe('warmPad');
    expect(result.current.eqProfileId).toBe('flat');
  });

  it('resetSettingsSection restores section defaults', () => {
    saveUserSettings({
      ...DEFAULT_USER_SETTINGS,
      general: {
        tonalCenter: 4,
        octaveRange: 3,
        playStyle: 'click_and_hold',
      },
    });

    const { result } = renderHook(() => useChordContext(), { wrapper });

    act(() => {
      result.current.resetSettingsSection('general');
    });

    expect(result.current.tonalCenter).toBe(
      DEFAULT_USER_SETTINGS.general.tonalCenter
    );
    expect(result.current.octaveRange).toBe(
      DEFAULT_USER_SETTINGS.general.octaveRange
    );
    expect(result.current.playStyle).toBe(
      DEFAULT_USER_SETTINGS.general.playStyle
    );
  });

  it('resetAllSettings clears storage and restores defaults', () => {
    saveUserSettings({
      ...DEFAULT_USER_SETTINGS,
      soundDesign: {
        ...DEFAULT_USER_SETTINGS.soundDesign,
        chorusWet: 0.9,
      },
    });

    const { result } = renderHook(() => useChordContext(), { wrapper });
    expect(result.current.chorusWet).toBe(0.9);

    act(() => {
      result.current.resetAllSettings();
    });

    expect(result.current.chorusWet).toBe(
      DEFAULT_USER_SETTINGS.soundDesign.chorusWet
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
