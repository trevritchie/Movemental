import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ChordProvider, useChordContext } from './ChordContext';
import { chordManager } from '../music/ChordManager';

/**
 * ChordProvider orchestration matrix for the no-tilt re-voice suppress pipeline.
 *
 * Contract (see noTiltRevoiceSuppress.ts + docs/movements-not-chords-tilt.md):
 * - Pointer commits arm suppress so the ChordContext re-voice effect skips once
 * - Legitimate control changes (register, voicing, bass, VL mode) must still re-voice
 * - Only commitPlayback may arm suppress on the pointer path
 */

const mocks = vi.hoisted(() => {
  const triggerAttack = vi.fn();
  return { triggerAttack };
});

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
    triggerAttack: mocks.triggerAttack,
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

async function enterNoTiltAndTapEarth(
  result: { current: ReturnType<typeof useChordContext> },
) {
  const earth = chordManager.getChordByName('Earth')!;
  await act(async () => {
    result.current.enterNoTiltSession();
  });
  await act(async () => {
    result.current.handleChordPointerDown(earth);
    await Promise.resolve();
  });
  return earth;
}

describe('ChordProvider pointer re-voice', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.triggerAttack.mockClear();
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

  it('does not permanently suppress register re-voice after a pointer tap', async () => {
    const { result } = renderHook(() => useChordContext(), { wrapper });
    await enterNoTiltAndTapEarth(result);

    expect(result.current.selectedChord?.name).toBe('Earth');
    const afterPointer = mocks.triggerAttack.mock.calls.length;

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.setOctaveRange(
        result.current.octaveRange === 3 ? 4 : 3,
      );
      await Promise.resolve();
    });

    expect(result.current.selectedChord?.name).toBe('Earth');
    expect(mocks.triggerAttack.mock.calls.length).toBeGreaterThan(afterPointer);
  });

  it('re-voices after voice-leading mode change following a pointer tap', async () => {
    const { result } = renderHook(() => useChordContext(), { wrapper });
    await enterNoTiltAndTapEarth(result);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const nextMode =
      result.current.voiceLeadingMode === 'smoothest'
        ? 'smooth'
        : 'smoothest';

    await act(async () => {
      result.current.setVoiceLeadingMode(nextMode);
      await Promise.resolve();
    });

    expect(result.current.voiceLeadingMode).toBe(nextMode);
    expect(result.current.selectedChord?.name).toBe('Earth');

    // Mode change may skip audio when pitches are unchanged; a later register
    // change must still re-voice (suppress must not stick).
    const afterMode = mocks.triggerAttack.mock.calls.length;
    await act(async () => {
      result.current.setOctaveRange(
        result.current.octaveRange === 3 ? 4 : 3,
      );
      await Promise.resolve();
    });
    expect(mocks.triggerAttack.mock.calls.length).toBeGreaterThan(afterMode);
  });

  it('re-voices after no-tilt voicing level change following a pointer tap', async () => {
    const { result } = renderHook(() => useChordContext(), { wrapper });
    await enterNoTiltAndTapEarth(result);
    const afterPointer = mocks.triggerAttack.mock.calls.length;

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.setNoTiltVoicingLevel(
        result.current.noTiltVoicingLevel === 8 ? 4 : 8,
      );
      await Promise.resolve();
    });

    expect(result.current.selectedChord?.name).toBe('Earth');
    expect(mocks.triggerAttack.mock.calls.length).toBeGreaterThan(afterPointer);
  });

  it('re-voices after bass position change when bass is unlocked', async () => {
    const { result } = renderHook(() => useChordContext(), { wrapper });
    await enterNoTiltAndTapEarth(result);
    const afterPointer = mocks.triggerAttack.mock.calls.length;

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isNoTiltBassLocked).toBe(false);

    await act(async () => {
      result.current.setNoTiltPositionLevel(
        result.current.noTiltPositionLevel === 4 ? 2 : 4,
      );
      await Promise.resolve();
    });

    expect(result.current.selectedChord?.name).toBe('Earth');
    expect(mocks.triggerAttack.mock.calls.length).toBeGreaterThan(afterPointer);
  });

  it('keeps chord selection through voicing lock toggle without dropping suppress forever', async () => {
    const { result } = renderHook(() => useChordContext(), { wrapper });
    await enterNoTiltAndTapEarth(result);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.toggleNoTiltVoicingLock();
    });
    expect(result.current.isNoTiltVoicingLocked).toBe(true);

    const afterLock = mocks.triggerAttack.mock.calls.length;

    await act(async () => {
      result.current.setOctaveRange(
        result.current.octaveRange === 3 ? 4 : 3,
      );
      await Promise.resolve();
    });

    expect(result.current.selectedChord?.name).toBe('Earth');
    expect(mocks.triggerAttack.mock.calls.length).toBeGreaterThan(afterLock);
  });

  it('re-voices selected chord and keeps later taps in the new tonal center', async () => {
    const { result } = renderHook(() => useChordContext(), { wrapper });
    const branch = chordManager.getChordByName('Branch')!;

    await act(async () => {
      result.current.enterNoTiltSession();
    });
    await act(async () => {
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    const pitchesAtBb = result.current.selectedChord?.pitches.slice() ?? [];
    expect(pitchesAtBb.length).toBeGreaterThan(0);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.setTonalCenter(0);
      await Promise.resolve();
    });

    const pitchesAtC = result.current.selectedChord?.pitches.slice() ?? [];
    expect(pitchesAtC).not.toEqual(pitchesAtBb);
    expect(result.current.tonalCenter).toBe(0);

    const freshBranch = chordManager.getChordByName('Branch')!;
    expect(freshBranch.pitches).toEqual(pitchesAtC);

    await act(async () => {
      result.current.handleChordPointerDown(freshBranch);
      await Promise.resolve();
    });

    expect(result.current.selectedChord?.pitches).toEqual(freshBranch.pitches);
    expect(result.current.selectedChord?.traditionalName).toBe(
      freshBranch.traditionalName,
    );
  });
});
