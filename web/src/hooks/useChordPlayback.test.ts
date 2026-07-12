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
  const borrowingState = getInitialBorrowingState();
  const setBorrowingState = vi.fn();
  const setSelectedChord = vi.fn();

  const baseOptions = {
    getBorrowingStateForChord: () => borrowingState,
    borrowingStateRef: { current: borrowingState },
    setBorrowingState,
    setSelectedChord,
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

    await Promise.resolve();
    await Promise.resolve();

    expect(setBorrowingState).toHaveBeenCalled();
    expect(callOrder.indexOf('borrowing')).toBeGreaterThan(
      callOrder.indexOf('audio'),
    );
  });
});
