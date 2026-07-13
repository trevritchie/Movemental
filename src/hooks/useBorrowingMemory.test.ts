/// <reference types="node" />
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useBorrowingMemory } from './useBorrowingMemory';
import { getInitialBorrowingState } from '../music/BorrowingLogic';
import type { Chord } from '../music/ChordManager';

const branch = { name: 'Branch' } as Chord;
const leaf = { name: 'Leaf' } as Chord;

function renderBorrowingMemory(selectedChord: Chord | null = branch) {
  const playAndDisplayChord = vi.fn();
  const hook = renderHook(
    ({ chord }) =>
      useBorrowingMemory({
        selectedChord: chord,
        playAndDisplayChord,
      }),
    { initialProps: { chord: selectedChord } },
  );
  return { playAndDisplayChord, ...hook };
}

function borrowingWithMutedRoot(): ReturnType<typeof getInitialBorrowingState> {
  const state = getInitialBorrowingState();
  state.noteStates[1] = 'off';
  return state;
}

describe('useBorrowingMemory', () => {
  it('restores per-chord saved line state when switching chords', () => {
    const { result, rerender } = renderBorrowingMemory();

    const mutedRoot = borrowingWithMutedRoot();

    act(() => {
      result.current.handleBorrowingStateChange(mutedRoot);
    });

    rerender({ chord: leaf });

    act(() => {
      result.current.setBorrowingState(getInitialBorrowingState());
    });

    rerender({ chord: branch });

    const restored = result.current.getBorrowingStateForChord(
      'Branch',
      getInitialBorrowingState(),
    );
    expect(restored.noteStates[1]).toBe('off');
  });

  it('uses global state for all lines when borrowing memory is global', () => {
    const { result, rerender } = renderBorrowingMemory();

    const mutedRoot = borrowingWithMutedRoot();

    act(() => {
      result.current.handleBorrowingStateChange(mutedRoot);
    });

    rerender({ chord: leaf });
    act(() => {
      result.current.setBorrowingMemory('global');
    });

    const globalMuted = getInitialBorrowingState();
    globalMuted.noteStates[2] = 'off';
    act(() => {
      result.current.setBorrowingState(globalMuted);
    });

    rerender({ chord: branch });

    const restored = result.current.getBorrowingStateForChord(
      'Branch',
      globalMuted,
    );
    expect(restored.noteStates[1]).toBe('on');
    expect(restored.noteStates[2]).toBe('off');
  });
});
