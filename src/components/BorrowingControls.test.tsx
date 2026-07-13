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
