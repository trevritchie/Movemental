import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ChordProvider, useChordContext } from './ChordContext';
import { chordManager } from '../music/ChordManager';

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
    triggerAttack: vi.fn(),
    isPageBackgrounded: () => false,
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
    orientationRef: { current: { gamma: 0, beta: 0 } },
    requestPermission: vi.fn(),
  }),
}));

vi.mock('../audio/pageInteraction', () => ({
  isPageInteractiveForAudio: () => true,
}));

vi.mock('../audio/iosMediaChannel', () => ({
  unlockIosMediaChannel: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <ChordProvider>{children}</ChordProvider>;
}

describe('ChordProvider pointer re-voice', () => {
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

  it('mounts and selects Wind after Earth then Wind pointer taps', async () => {
    const earth = chordManager.getChordByName('Earth')!;
    const wind = chordManager.getChordByName('Wind')!;
    const { result } = renderHook(() => useChordContext(), { wrapper });

    expect(result.current.selectedChord).toBeNull();

    await act(async () => {
      result.current.enterNoTiltSession();
    });

    await act(async () => {
      result.current.handleChordPointerDown(earth);
    });

    expect(result.current.selectedChord?.name).toBe('Earth');

    await act(async () => {
      result.current.handleChordPointerDown(wind);
    });

    expect(result.current.selectedChord?.name).toBe('Wind');
  });
});
