/// <reference types="node" />
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useBorrowingMemory } from './useBorrowingMemory';
import { getInitialBorrowingState } from '../music/BorrowingLogic';
import type { Chord } from '../music/ChordManager';

const branch = { name: 'Branch' } as Chord;
const leaf = { name: 'Leaf' } as Chord;

describe('useBorrowingMemory', () => {
  it('restores per-chord saved line state when switching chords', () => {
    const playAndDisplayChord = vi.fn();

    const { result, rerender } = renderHook(
      ({ selectedChord }) =>
        useBorrowingMemory({ selectedChord, playAndDisplayChord }),
      { initialProps: { selectedChord: branch as Chord | null } },
    );

    const mutedRoot = getInitialBorrowingState();
    mutedRoot.noteStates[1] = 'off';

    act(() => {
      result.current.handleBorrowingStateChange(mutedRoot);
    });

    rerender({ selectedChord: leaf });

    act(() => {
      result.current.setBorrowingState(getInitialBorrowingState());
    });

    rerender({ selectedChord: branch });

    const restored = result.current.getBorrowingStateForChord(
      'Branch',
      getInitialBorrowingState(),
    );
    expect(restored.noteStates[1]).toBe('off');
  });

  it('uses global state for all lines when borrowing memory is global', () => {
    const playAndDisplayChord = vi.fn();

    const { result, rerender } = renderHook(
      ({ selectedChord }) =>
        useBorrowingMemory({ selectedChord, playAndDisplayChord }),
      { initialProps: { selectedChord: branch as Chord | null } },
    );

    const mutedRoot = getInitialBorrowingState();
    mutedRoot.noteStates[1] = 'off';

    act(() => {
      result.current.handleBorrowingStateChange(mutedRoot);
    });

    rerender({ selectedChord: leaf });
    act(() => {
      result.current.setBorrowingMemory('global');
    });

    const globalMuted = getInitialBorrowingState();
    globalMuted.noteStates[2] = 'off';
    act(() => {
      result.current.setBorrowingState(globalMuted);
    });

    rerender({ selectedChord: branch });

    const restored = result.current.getBorrowingStateForChord(
      'Branch',
      globalMuted,
    );
    expect(restored.noteStates[1]).toBe('on');
    expect(restored.noteStates[2]).toBe('off');
  });
});
