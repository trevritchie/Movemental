import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FLAT_TILT } from '../music/TiltVoicingEngine';
import { getInitialBorrowingState } from '../music/BorrowingLogic';

const mocks = vi.hoisted(() => {
  const triggerAttack = vi.fn();
  const releaseActiveNotes = vi.fn();
  const registerReleaseListener = vi.fn(() => () => {});
  return { triggerAttack, releaseActiveNotes, registerReleaseListener };
});

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    triggerAttack: mocks.triggerAttack,
    releaseActiveNotes: mocks.releaseActiveNotes,
    registerReleaseListener: mocks.registerReleaseListener,
    isPageBackgrounded: () => false,
  },
}));

vi.mock('../audio/iosMediaChannel', () => ({
  unlockIosMediaChannel: vi.fn(),
}));

vi.mock('../audio/pageInteraction', () => ({
  isPageInteractiveForAudio: () => true,
}));

import { useChordPlayback } from './useChordPlayback';
import { chordManager } from '../music/ChordManager';

describe('useChordPlayback audio-first pointer path', () => {
  const branch = chordManager.getChordByName('Branch')!;
  const wind = chordManager.getChordByName('Wind')!;
  const earth = chordManager.getChordByName('Earth')!;
  const borrowingState = getInitialBorrowingState();
  const setBorrowingState = vi.fn();
  const setSelectedChord = vi.fn();
  const selectedChordNameRef = { current: null as string | null };

  const baseOptions = {
    getBorrowingStateForChord: () => borrowingState,
    borrowingStateRef: { current: borrowingState },
    setBorrowingState,
    setSelectedChord,
    selectedChordNameRef,
    rawTiltRef: { current: FLAT_TILT },
    noTiltVoicingLevelRef: { current: 0 },
    noTiltPositionLevelRef: { current: 0 },
    tonalCenterRef: { current: 0 },
    voiceLeadingModeRef: { current: 'smoothest' as const },
    setNoTiltPositionLevel: vi.fn(),
    noTiltLockMapsRef: {
      current: { voicing: {}, bass: {} },
    },
    applyNoTiltLocksForChord: vi.fn(),
    clearNoTiltChordLocks: vi.fn(),
    hasPersistedSettings: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    selectedChordNameRef.current = null;
  });

  it('schedules audio before borrowing setState on diagram pointer tap', async () => {
    const callOrder: string[] = [];
    mocks.triggerAttack.mockImplementation(() => {
      callOrder.push('audio');
    });
    setBorrowingState.mockImplementation(() => {
      callOrder.push('borrowing');
    });

    const { result } = renderHook(() => useChordPlayback(baseOptions));

    act(() => {
      result.current.enterNoTiltSession();
      result.current.handleChordPointerDown(branch);
    });

    expect(mocks.triggerAttack).toHaveBeenCalled();
    expect(callOrder[0]).toBe('audio');
    expect(setBorrowingState).toHaveBeenCalled();
    expect(callOrder.indexOf('borrowing')).toBeGreaterThan(
      callOrder.indexOf('audio'),
    );
  });

  it('updates selected chord sync so deferred level updates cannot replay the prior chord', async () => {
    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterNoTiltSession();
      result.current.handleChordPointerDown(earth);
      await Promise.resolve();
    });

    const afterEarth = setSelectedChord.mock.calls.at(-1)?.[0] as
      | { name: string }
      | undefined;
    expect(afterEarth?.name).toBe('Earth');
    expect(selectedChordNameRef.current).toBe('Earth');

    const earthCalls = mocks.triggerAttack.mock.calls.length;

    await act(async () => {
      result.current.handleChordPointerDown(wind);
      await Promise.resolve();
    });

    const afterWind = setSelectedChord.mock.calls.at(-1)?.[0] as
      | { name: string }
      | undefined;
    expect(afterWind?.name).toBe('Wind');
    expect(selectedChordNameRef.current).toBe('Wind');
    expect(mocks.triggerAttack.mock.calls.length).toBeGreaterThan(earthCalls);

    // Simulate the ChordContext re-voice effect after a deferred position
    // level flush: it must re-voice Wind, not stuck Earth.
    await act(async () => {
      result.current.playAndDisplayChord(
        chordManager.getChordByName(selectedChordNameRef.current!)!,
        borrowingState,
      );
      await Promise.resolve();
    });

    const afterRevoice = setSelectedChord.mock.calls.at(-1)?.[0] as
      | { name: string }
      | undefined;
    expect(afterRevoice?.name).toBe('Wind');
    expect(selectedChordNameRef.current).toBe('Wind');
  });
});
