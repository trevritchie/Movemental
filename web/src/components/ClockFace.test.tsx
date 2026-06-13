import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClockFace } from './ClockFace';

vi.mock('../context/ChordContext', () => ({
  useChordContext: () => ({
    tonalCenter: 10,
    activePitches: [58, 62, 65, 69],
    selectedChord: { name: 'Branch', traditionalName: 'Bb maj6' },
  }),
}));

describe('ClockFace playing notes readout', () => {
  it('shows inline traditional name and notes on desktop', () => {
    const { container } = render(<ClockFace />);
    expect(screen.getByText('Bb maj6 - Bb3 D4 F4 A4')).toBeInTheDocument();
    expect(container.querySelector('.playing-notes')).toBeNull();
  });

  it('shows playing notes on a separate row on mobile overlay', () => {
    const { container } = render(<ClockFace isMobileOverlay />);
    const clockInfo = container.querySelector('.clock-info');
    expect(clockInfo?.querySelector('.traditional-name')?.textContent).toBe(
      'Bb maj6'
    );
    expect(clockInfo?.querySelector('.playing-notes')?.textContent).toBe(
      'Bb3 D4 F4 A4'
    );
  });
});
