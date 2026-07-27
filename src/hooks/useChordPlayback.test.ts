import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FLAT_TILT } from '../music/TiltVoicingEngine';
import { getInitialBorrowingState } from '../music/BorrowingLogic';
import {
  createNoTiltRevoiceSuppressState,
} from '../music/noTiltRevoiceSuppress';

const mocks = vi.hoisted(() => {
  const triggerAttack = vi.fn();
  const updateVoicingDiff = vi.fn();
  const releaseActiveNotes = vi.fn();
  const registerReleaseListener = vi.fn(() => () => {});
  const isPageBackgrounded = vi.fn(() => false);
  const isPageInteractiveForAudio = vi.fn(() => true);
  return {
    triggerAttack,
    updateVoicingDiff,
    releaseActiveNotes,
    registerReleaseListener,
    isPageBackgrounded,
    isPageInteractiveForAudio,
  };
});

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    triggerAttack: mocks.triggerAttack,
    updateVoicingDiff: mocks.updateVoicingDiff,
    releaseActiveNotes: mocks.releaseActiveNotes,
    registerReleaseListener: mocks.registerReleaseListener,
    isPageBackgrounded: mocks.isPageBackgrounded,
  },
}));

vi.mock('../audio/iosMediaChannel', () => ({
  unlockIosMediaChannel: vi.fn(),
}));

vi.mock('../audio/pageInteraction', () => ({
  isPageInteractiveForAudio: mocks.isPageInteractiveForAudio,
}));

import type { VoiceLeadingMode, VoicingElevatorFloorsMode } from '../music/sessionModes';
import type { ShortestNote } from '../settings/userSettingsSchema';
import { useChordPlayback } from './useChordPlayback';
import { chordManager } from '../music/ChordManager';

describe('useChordPlayback audio-first pointer path', () => {
  const branch = chordManager.getChordByName('Branch')!;
  const wind = chordManager.getChordByName('Wind')!;
  const earth = chordManager.getChordByName('Earth')!;
  const borrowingState = getInitialBorrowingState();
  const setBorrowingState = vi.fn();
  const setSelectedChord = vi.fn();
  const setNoTiltPositionLevel = vi.fn();
  const selectedChordNameRef = { current: null as string | null };
  const suppressNoTiltRevoiceRef = {
    current: createNoTiltRevoiceSuppressState(),
  };

  const baseOptions = {
    getBorrowingStateForChord: () => borrowingState,
    borrowingStateRef: { current: borrowingState },
    setBorrowingState,
    setSelectedChord,
    selectedChordNameRef,
    suppressNoTiltRevoiceRef,
    rawTiltRef: { current: FLAT_TILT },
    noTiltVoicingLevelRef: { current: 0 },
    noTiltPositionLevelRef: { current: 0 },
    tonalCenterRef: { current: 0 },
    voiceLeadingModeRef: { current: 'smoothest' as VoiceLeadingMode },
    voicingElevatorFloorsModeRef: {
      current: 'all' as VoicingElevatorFloorsMode,
    },
    setNoTiltPositionLevel,
    noTiltLockMapsRef: {
      current: { voicing: {}, bass: {} },
    },
    applyNoTiltLocksForChord: vi.fn(),
    clearNoTiltChordLocks: vi.fn(),
    hasPersistedSettings: false,
    retriggerSoundingNotesRef: { current: false },
    tiltToStrumRef: { current: false },
    shortestNoteRef: { current: '16n' as ShortestNote },
    bpmRef: { current: 120 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    selectedChordNameRef.current = null;
    suppressNoTiltRevoiceRef.current = createNoTiltRevoiceSuppressState();
    baseOptions.noTiltPositionLevelRef.current = 0;
    baseOptions.voiceLeadingModeRef.current = 'smoothest';
    baseOptions.voicingElevatorFloorsModeRef.current = 'all';
    baseOptions.retriggerSoundingNotesRef.current = false;
    baseOptions.tiltToStrumRef.current = false;
    baseOptions.shortestNoteRef.current = '16n';
    baseOptions.bpmRef.current = 120;
    baseOptions.rawTiltRef.current = FLAT_TILT;
    mocks.isPageBackgrounded.mockReturnValue(false);
    mocks.isPageInteractiveForAudio.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
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

    await act(async () => {
      result.current.enterNoTiltSession();
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    expect(mocks.triggerAttack).toHaveBeenCalled();
    expect(callOrder[0]).toBe('audio');
    expect(setBorrowingState).toHaveBeenCalled();
    expect(callOrder.indexOf('borrowing')).toBeGreaterThan(
      callOrder.indexOf('audio'),
    );
  });

  it('does not call setNoTiltPositionLevel before audio on smoothest pointer path', async () => {
    const callOrder: string[] = [];
    mocks.triggerAttack.mockImplementation(() => {
      callOrder.push('audio');
    });
    setNoTiltPositionLevel.mockImplementation(() => {
      callOrder.push('level');
    });

    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterNoTiltSession();
      result.current.handleChordPointerDown(earth);
      await Promise.resolve();
    });

    expect(mocks.triggerAttack).toHaveBeenCalled();
    expect(callOrder[0]).toBe('audio');
    const levelIdx = callOrder.indexOf('level');
    if (levelIdx >= 0) {
      expect(levelIdx).toBeGreaterThan(callOrder.indexOf('audio'));
    }
  });

  it('does not call setNoTiltPositionLevel before audio on smooth pointer path', async () => {
    baseOptions.voiceLeadingModeRef.current = 'smooth';
    const callOrder: string[] = [];
    mocks.triggerAttack.mockImplementation(() => {
      callOrder.push('audio');
    });
    setNoTiltPositionLevel.mockImplementation(() => {
      callOrder.push('level');
    });

    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterNoTiltSession();
      result.current.handleChordPointerDown(earth);
      await Promise.resolve();
    });

    expect(mocks.triggerAttack).toHaveBeenCalled();
    expect(callOrder[0]).toBe('audio');
    const levelIdx = callOrder.indexOf('level');
    if (levelIdx >= 0) {
      expect(levelIdx).toBeGreaterThan(callOrder.indexOf('audio'));
    }
  });

  it('arms re-voice suppress generation on pointer commit', () => {
    const { result } = renderHook(() => useChordPlayback(baseOptions));

    act(() => {
      result.current.enterNoTiltSession();
      result.current.handleChordPointerDown(earth);
      expect(suppressNoTiltRevoiceRef.current.generation).toBeGreaterThan(0);
      expect(
        suppressNoTiltRevoiceRef.current.generation,
      ).toBeGreaterThan(suppressNoTiltRevoiceRef.current.consumed);
    });
  });

  it('arms suppress before deferred level setState after audio', async () => {
    const callOrder: string[] = [];
    mocks.triggerAttack.mockImplementation(() => {
      callOrder.push('audio');
    });
    setNoTiltPositionLevel.mockImplementation(() => {
      callOrder.push('level');
      expect(
        suppressNoTiltRevoiceRef.current.generation,
      ).toBeGreaterThan(suppressNoTiltRevoiceRef.current.consumed);
    });

    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterNoTiltSession();
      result.current.handleChordPointerDown(earth);
      await Promise.resolve();
    });

    expect(callOrder[0]).toBe('audio');
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

  it('retriggers all notes on chord-name change when retriggerSoundingNotes is on', async () => {
    baseOptions.retriggerSoundingNotesRef.current = true;
    const sisterBranch = chordManager.getChordByName('Sister Branch')!;

    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterNoTiltSession();
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    mocks.triggerAttack.mockClear();

    await act(async () => {
      result.current.handleChordPointerDown(earth);
      await Promise.resolve();
    });

    expect(mocks.triggerAttack).toHaveBeenCalled();
    expect(mocks.triggerAttack.mock.calls.at(-1)?.[1]).toBe(true);

    mocks.triggerAttack.mockClear();

    await act(async () => {
      result.current.handleChordPointerDown(sisterBranch);
      await Promise.resolve();
    });

    expect(mocks.triggerAttack.mock.calls.at(-1)?.[1]).toBe(true);
  });

  it('does not force retrigger on chord-name change when setting is off', async () => {
    baseOptions.retriggerSoundingNotesRef.current = false;

    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterNoTiltSession();
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    mocks.triggerAttack.mockClear();

    await act(async () => {
      result.current.handleChordPointerDown(earth);
      await Promise.resolve();
    });

    expect(mocks.triggerAttack).toHaveBeenCalled();
    expect(mocks.triggerAttack.mock.calls.at(-1)?.[1]).toBe(false);
  });

  it('does not apply retriggerSoundingNotes to same-chord revoices', async () => {
    baseOptions.retriggerSoundingNotesRef.current = true;

    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterNoTiltSession();
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    mocks.triggerAttack.mockClear();

    await act(async () => {
      result.current.playAndDisplayChord(branch, borrowingState);
      await Promise.resolve();
    });

    if (mocks.triggerAttack.mock.calls.length > 0) {
      expect(mocks.triggerAttack.mock.calls.at(-1)?.[1]).toBe(false);
    }
  });

  it('mutes all voices via release + empty commitPlayback without rewriting labels', async () => {
    const allOff = getInitialBorrowingState();
    allOff.noteStates = { 1: 'off', 2: 'off', 3: 'off', 4: 'off' };

    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterTiltSession();
      result.current.playAndDisplayChord(wind, borrowingState);
      await Promise.resolve();
    });

    expect(mocks.triggerAttack).toHaveBeenCalled();
    expect(result.current.activePitches.length).toBeGreaterThan(0);
    const bassBeforeMute = result.current.lastPlayedBassLabel;
    const voicingBeforeMute = result.current.lastPlayedVoicingLabel;
    expect(bassBeforeMute).not.toBeNull();
    const attacksAfterSound = mocks.triggerAttack.mock.calls.length;

    await act(async () => {
      result.current.playAndDisplayChord(wind, allOff);
      await Promise.resolve();
    });

    expect(mocks.releaseActiveNotes).toHaveBeenCalled();
    expect(mocks.triggerAttack.mock.calls.length).toBe(attacksAfterSound);
    expect(result.current.activePitches).toEqual([]);
    expect(selectedChordNameRef.current).toBe('Wind');
    expect(result.current.lastPlayedBassLabel).toBe(bassBeforeMute);
    expect(result.current.lastPlayedVoicingLabel).toBe(voicingBeforeMute);

    await act(async () => {
      result.current.playAndDisplayChord(wind, borrowingState);
      await Promise.resolve();
    });

    expect(mocks.triggerAttack.mock.calls.length).toBeGreaterThan(
      attacksAfterSound,
    );
    expect(result.current.activePitches.length).toBeGreaterThan(0);
  });

  it('clearPlaybackSelection releases audio and wipes session state', async () => {
    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterNoTiltSession();
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    expect(result.current.activePitches.length).toBeGreaterThan(0);
    expect(selectedChordNameRef.current).toBe('Branch');
    expect(result.current.previousPlayedChord?.name).toBe('Branch');
    mocks.releaseActiveNotes.mockClear();

    await act(async () => {
      result.current.clearPlaybackSelection();
    });

    expect(mocks.releaseActiveNotes).toHaveBeenCalled();
    expect(selectedChordNameRef.current).toBeNull();
    expect(setSelectedChord).toHaveBeenCalledWith(null);
    expect(result.current.activePitches).toEqual([]);
    expect(result.current.previousPlayedChord).toBeNull();
    expect(result.current.lastPlayedBassLabel).toBeNull();
    expect(result.current.lastPlayedVoicingLabel).toBeNull();
    expect(result.current.lastElementalPlayback).toBeNull();
  });

  it('panicStop disarms tilt-strum until the next chord tap', async () => {
    baseOptions.tiltToStrumRef.current = true;
    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterTiltSession();
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    expect(selectedChordNameRef.current).toBe('Branch');
    mocks.updateVoicingDiff.mockClear();

    await act(async () => {
      result.current.panicStop();
    });

    expect(selectedChordNameRef.current).toBeNull();
    baseOptions.rawTiltRef.current = { x: -0.75, y: 0 };

    await act(async () => {
      vi.advanceTimersByTime(130);
      result.current.handleTiltStrumSample();
    });

    expect(mocks.updateVoicingDiff).not.toHaveBeenCalled();

    await act(async () => {
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    mocks.updateVoicingDiff.mockClear();
    baseOptions.rawTiltRef.current = { x: -0.5, y: -0.5 };

    await act(async () => {
      vi.advanceTimersByTime(130);
      result.current.handleTiltStrumSample();
    });

    expect(mocks.updateVoicingDiff).toHaveBeenCalled();
  });

  it('does not strum when tiltToStrum is off', async () => {
    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterTiltSession();
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    mocks.triggerAttack.mockClear();
    mocks.updateVoicingDiff.mockClear();
    baseOptions.rawTiltRef.current = { x: -0.5, y: -0.5 };

    await act(async () => {
      result.current.handleTiltStrumSample();
    });

    expect(mocks.updateVoicingDiff).not.toHaveBeenCalled();
    expect(mocks.triggerAttack).not.toHaveBeenCalled();
  });

  it('strums a voicing diff when tilt level changes in tilt mode', async () => {
    baseOptions.tiltToStrumRef.current = true;
    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterTiltSession();
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    mocks.triggerAttack.mockClear();
    mocks.updateVoicingDiff.mockClear();
    baseOptions.rawTiltRef.current = { x: -0.75, y: 0 };

    await act(async () => {
      vi.advanceTimersByTime(130);
      result.current.handleTiltStrumSample();
    });

    expect(mocks.updateVoicingDiff).toHaveBeenCalled();
    expect(mocks.triggerAttack).not.toHaveBeenCalled();
  });

  it('does not strum on unchanged tilt levels', async () => {
    baseOptions.tiltToStrumRef.current = true;
    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterTiltSession();
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    mocks.updateVoicingDiff.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(130);
      result.current.handleTiltStrumSample();
    });

    expect(mocks.updateVoicingDiff).not.toHaveBeenCalled();
  });

  it('does not strum across skipped Every Other floors', async () => {
    baseOptions.tiltToStrumRef.current = true;
    baseOptions.voicingElevatorFloorsModeRef.current = 'every_other';
    // Start in the lowest Every Other child stop (Unison).
    baseOptions.rawTiltRef.current = { x: -1, y: 0 };
    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterTiltSession();
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    mocks.updateVoicingDiff.mockClear();
    // Still inside the Unison Every Other stop.
    baseOptions.rawTiltRef.current = { x: -0.9, y: 0 };

    await act(async () => {
      vi.advanceTimersByTime(300);
      result.current.handleTiltStrumSample();
    });

    expect(mocks.updateVoicingDiff).not.toHaveBeenCalled();

    // Next Every Other stop (Triad) should strum.
    baseOptions.rawTiltRef.current = { x: -0.75, y: 0 };

    await act(async () => {
      vi.advanceTimersByTime(300);
      result.current.handleTiltStrumSample();
    });

    expect(mocks.updateVoicingDiff).toHaveBeenCalled();
  });

  it('blocks hold-mode strum when the pointer is up', async () => {
    baseOptions.tiltToStrumRef.current = true;
    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterTiltSession();
      result.current.setPlayStyle('tap_and_hold');
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
      result.current.handleChordPointerUp();
    });

    mocks.updateVoicingDiff.mockClear();
    baseOptions.rawTiltRef.current = { x: -0.75, y: 0 };

    await act(async () => {
      vi.advanceTimersByTime(130);
      result.current.handleTiltStrumSample();
    });

    expect(mocks.updateVoicingDiff).not.toHaveBeenCalled();
  });

  it('flushes a rate-limited level change after the interval without further tilt', async () => {
    baseOptions.tiltToStrumRef.current = true;
    baseOptions.shortestNoteRef.current = '8n';
    baseOptions.bpmRef.current = 120;
    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterTiltSession();
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    mocks.updateVoicingDiff.mockClear();
    baseOptions.rawTiltRef.current = { x: -0.75, y: 0 };

    await act(async () => {
      // Inside the 250 ms 8n window seeded by the tap.
      result.current.handleTiltStrumSample();
    });

    expect(mocks.updateVoicingDiff).not.toHaveBeenCalled();

    await act(async () => {
      // Quiet sensor: only the pending timer fires.
      vi.advanceTimersByTime(250);
    });

    expect(mocks.updateVoicingDiff).toHaveBeenCalled();
  });

  it('does not strum while the page is backgrounded or hidden', async () => {
    baseOptions.tiltToStrumRef.current = true;
    const { result } = renderHook(() => useChordPlayback(baseOptions));

    await act(async () => {
      result.current.enterTiltSession();
      result.current.handleChordPointerDown(branch);
      await Promise.resolve();
    });

    mocks.updateVoicingDiff.mockClear();
    mocks.isPageInteractiveForAudio.mockReturnValue(false);
    baseOptions.rawTiltRef.current = { x: -0.75, y: 0 };

    await act(async () => {
      vi.advanceTimersByTime(130);
      result.current.handleTiltStrumSample();
    });

    expect(mocks.updateVoicingDiff).not.toHaveBeenCalled();

    mocks.isPageInteractiveForAudio.mockReturnValue(true);
    mocks.isPageBackgrounded.mockReturnValue(true);

    await act(async () => {
      result.current.handleTiltStrumSample();
    });

    expect(mocks.updateVoicingDiff).not.toHaveBeenCalled();
  });
});
