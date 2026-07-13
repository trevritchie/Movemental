import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { BorrowingControls } from './BorrowingControls';
import { getInitialBorrowingState } from '../music/BorrowingLogic';

const handleBorrowingStateChange = vi.fn();

vi.mock('../hooks/useLayoutTier', () => ({
  useLayoutTier: vi.fn(() => 'phone'),
}));

vi.mock('../context/ChordContext', () => ({
  useChordContext: () => ({
    borrowingState: getInitialBorrowingState(),
    handleBorrowingStateChange,
    selectedChord: { name: 'Branch', pitches: [60, 64, 67] },
    tonalCenter: 0,
  }),
}));

vi.mock('./AppToolbar', () => ({
  MobileActionButtons: () => null,
}));

describe('BorrowingControls slider gestures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not preview audio when the OS cancels an in-flight drag', () => {
    const { container } = render(<BorrowingControls disabled={false} />);
    const slider = container.querySelector('.borrow-slider') as HTMLElement;

    fireEvent.pointerDown(slider, { clientY: 80, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientY: 20, pointerId: 1 });
    fireEvent.pointerCancel(slider, { clientY: 20, pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(handleBorrowingStateChange).not.toHaveBeenCalled();
  });

  it('previews after a deliberate drag once the debounce elapses', () => {
    const { container } = render(<BorrowingControls disabled={false} />);
    const slider = container.querySelector('.borrow-slider') as HTMLElement;
    const rect = slider.getBoundingClientRect();

    Object.defineProperty(slider, 'getBoundingClientRect', {
      value: () => ({
        top: 0,
        height: 120,
        left: 0,
        width: 40,
        right: 40,
        bottom: 120,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerDown(slider, { clientY: 90, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientY: 10, pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(handleBorrowingStateChange).toHaveBeenCalled();
    void rect;
  });

  it('skips a pending preview when the page is no longer visible', () => {
    const { container } = render(<BorrowingControls disabled={false} />);
    const slider = container.querySelector('.borrow-slider') as HTMLElement;

    Object.defineProperty(slider, 'getBoundingClientRect', {
      value: () => ({
        top: 0,
        height: 120,
        left: 0,
        width: 40,
        right: 40,
        bottom: 120,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerDown(slider, { clientY: 90, pointerId: 1 });
    fireEvent.pointerMove(slider, { clientY: 10, pointerId: 1 });

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(handleBorrowingStateChange).not.toHaveBeenCalled();
  });
});

describe('BorrowingControls slider keyboard support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes each voice slider as a labeled, focusable ARIA slider', () => {
    const { container } = render(<BorrowingControls disabled={false} />);
    const sliders = container.querySelectorAll('.borrow-slider');

    expect(sliders).toHaveLength(4);
    sliders.forEach((slider, i) => {
      expect(slider).toHaveAttribute('role', 'slider');
      expect(slider).toHaveAttribute('tabindex', '0');
      expect(slider).toHaveAttribute('aria-label', `Voice ${i + 1} borrowing`);
      expect(slider).toHaveAttribute('aria-valuenow', '0');
      expect(slider).toHaveAttribute('aria-valuetext', 'neutral');
    });
  });

  it('moves the active slot with arrow keys and toggles mute with Enter', () => {
    const { container } = render(<BorrowingControls disabled={false} />);
    const slider = container.querySelector('.borrow-slider') as HTMLElement;

    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(handleBorrowingStateChange).toHaveBeenCalledTimes(1);
    let newState = handleBorrowingStateChange.mock.calls[0][0];
    expect(newState.borrowingDirections[1]).toBe('up');

    handleBorrowingStateChange.mockClear();
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(handleBorrowingStateChange).toHaveBeenCalledTimes(1);
    newState = handleBorrowingStateChange.mock.calls[0][0];
    expect(newState.borrowingDirections[1]).toBe('down');

    handleBorrowingStateChange.mockClear();
    fireEvent.keyDown(slider, { key: 'Enter' });
    expect(handleBorrowingStateChange).toHaveBeenCalledTimes(1);
    newState = handleBorrowingStateChange.mock.calls[0][0];
    expect(newState.noteStates[1]).toBe('off');
  });

  it('does not respond to keyboard input when disabled', () => {
    const { container } = render(<BorrowingControls disabled={true} />);
    const slider = container.querySelector('.borrow-slider') as HTMLElement;

    expect(slider).toHaveAttribute('tabindex', '-1');
    expect(slider).toHaveAttribute('aria-disabled', 'true');

    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(handleBorrowingStateChange).not.toHaveBeenCalled();
  });
});
