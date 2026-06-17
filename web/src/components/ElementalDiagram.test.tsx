import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ElementalDiagram } from './ElementalDiagram';

vi.mock('../context/ChordContext', () => ({
  useChordContext: () => ({
    selectedChord: null,
    borrowingState: {
      circlePositions: { 1: 'line', 2: 'line', 3: 'line', 4: 'line' },
      noteStates: { 1: 'off', 2: 'off', 3: 'off', 4: 'off' },
    },
    handleChordPointerDown: vi.fn(),
    handleChordPointerUp: vi.fn(),
    handleChordPointerEnter: vi.fn(),
  }),
}));

vi.mock('../hooks/useLayoutTier', () => ({
  useLayoutTier: () => 'phone',
}));

async function flushAnimationFrames(count = 2): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
}

describe('ElementalDiagram ready gate', () => {
  it('should hide diagram until layout settles after mount', async () => {
    const { container } = render(<ElementalDiagram />);
    const diagram = container.querySelector('.diagram-container');

    expect(diagram).not.toBeNull();
    expect(diagram).toHaveStyle({ opacity: '0' });

    await flushAnimationFrames(2);

    await waitFor(() => {
      expect(diagram).toHaveStyle({ opacity: '1' });
    });
  });
});
