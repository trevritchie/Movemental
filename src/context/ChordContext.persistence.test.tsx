import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ChordProvider, useChordContext } from './ChordContext';
import { useSoundDesignContext } from './SoundDesignContext';
import { DEFAULT_USER_SETTINGS } from '../settings/userSettingsSchema';
import { saveUserSettings, STORAGE_KEY } from '../settings/userSettingsStorage';

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    setChorusWet: vi.fn(),
    setDelayWet: vi.fn(),
    setReverbWet: vi.fn(),
    setEnvelope: vi.fn(),
    setSamplerNaturalEnvelope: vi.fn(),
    setOutputProfile: vi.fn(),
    applyEnvelopeSettings: vi.fn(),
    applyPreset: vi.fn().mockResolvedValue(undefined),
    getSynthPresetId: vi.fn(() => 'trumpet'),
    releaseActiveNotes: vi.fn(),
    registerReleaseListener: vi.fn(() => vi.fn()),
    handlePageBackground: vi.fn(),
    handlePageForeground: vi.fn().mockResolvedValue(undefined),
    playChord: vi.fn(),
    startDrone: vi.fn(),
    stopDrone: vi.fn(),
    startContext: vi.fn(),
  },
}));

vi.mock('../hooks/useLayoutTier', () => ({
  useLayoutTier: vi.fn(() => 'desktop'),
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

/** Combines both context values so existing assertions can keep reading a single `result.current`. */
function useCombinedChordContext() {
  return { ...useChordContext(), ...useSoundDesignContext() };
}

describe('ChordProvider persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('initializes from saved settings including instrument preset', () => {
    saveUserSettings({
      ...DEFAULT_USER_SETTINGS,
      general: {
        tonalCenter: 4,
        octaveRange: 3,
        playStyle: 'click_and_hold',
        retriggerSoundingNotes: true,
      },
      voiceLeading: { mode: 'root_position' },
      soundDesign: {
        ...DEFAULT_USER_SETTINGS.soundDesign,
        synthPresetId: 'warmPad',
        eqProfileId: 'flat',
      },
    });

    const { result } = renderHook(() => useCombinedChordContext(), { wrapper });

    expect(result.current.tonalCenter).toBe(4);
    expect(result.current.octaveRange).toBe(3);
    expect(result.current.playStyle).toBe('click_and_hold');
    expect(result.current.retriggerSoundingNotes).toBe(true);
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
        retriggerSoundingNotes: true,
      },
    });

    const { result } = renderHook(() => useCombinedChordContext(), { wrapper });

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
    expect(result.current.retriggerSoundingNotes).toBe(
      DEFAULT_USER_SETTINGS.general.retriggerSoundingNotes
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

    const { result } = renderHook(() => useCombinedChordContext(), { wrapper });
    expect(result.current.chorusWet).toBe(0.9);

    act(() => {
      result.current.resetAllSettings();
    });

    expect(result.current.chorusWet).toBe(
      DEFAULT_USER_SETTINGS.soundDesign.chorusWet
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('resetSettingsSection voiceLeading uses smoothest in no-tilt session', () => {
    const { result } = renderHook(() => useCombinedChordContext(), { wrapper });

    act(() => {
      result.current.enterNoTiltSession();
      result.current.setVoiceLeadingMode('root_position');
    });

    act(() => {
      result.current.resetSettingsSection('voiceLeading');
    });

    expect(result.current.voiceLeadingMode).toBe('smoothest');
  });

  it('resetSettingsSection voiceLeading uses smooth in tilt session', () => {
    const { result } = renderHook(() => useCombinedChordContext(), { wrapper });

    act(() => {
      result.current.enterTiltSession();
      result.current.setVoiceLeadingMode('root_position');
    });

    act(() => {
      result.current.resetSettingsSection('voiceLeading');
    });

    expect(result.current.voiceLeadingMode).toBe('smooth');
  });

  it('resetSettingsGroup restores only play style', () => {
    saveUserSettings({
      ...DEFAULT_USER_SETTINGS,
      general: {
        tonalCenter: 4,
        octaveRange: 3,
        playStyle: 'click_and_hold',
        retriggerSoundingNotes: true,
      },
    });

    const { result } = renderHook(() => useCombinedChordContext(), { wrapper });

    act(() => {
      result.current.resetSettingsGroup('playStyle');
    });

    expect(result.current.playStyle).toBe(
      DEFAULT_USER_SETTINGS.general.playStyle,
    );
    expect(result.current.tonalCenter).toBe(4);
    expect(result.current.octaveRange).toBe(3);
    expect(result.current.retriggerSoundingNotes).toBe(true);
  });

  it('resetSettingsGroup restores tonal center note and octave together', () => {
    saveUserSettings({
      ...DEFAULT_USER_SETTINGS,
      general: {
        tonalCenter: 4,
        octaveRange: 3,
        playStyle: 'click_and_hold',
        retriggerSoundingNotes: true,
      },
    });

    const { result } = renderHook(() => useCombinedChordContext(), { wrapper });

    act(() => {
      result.current.resetSettingsGroup('tonalCenter');
    });

    expect(result.current.tonalCenter).toBe(
      DEFAULT_USER_SETTINGS.general.tonalCenter,
    );
    expect(result.current.octaveRange).toBe(
      DEFAULT_USER_SETTINGS.general.octaveRange,
    );
    expect(result.current.playStyle).toBe('click_and_hold');
  });

  it('resetAllSettings uses session voice leading default in no-tilt', () => {
    saveUserSettings({
      ...DEFAULT_USER_SETTINGS,
      voiceLeading: { mode: 'root_position' },
    });

    const { result } = renderHook(() => useCombinedChordContext(), { wrapper });

    act(() => {
      result.current.enterNoTiltSession();
    });

    act(() => {
      result.current.resetAllSettings();
    });

    expect(result.current.voiceLeadingMode).toBe('smoothest');
  });
});
