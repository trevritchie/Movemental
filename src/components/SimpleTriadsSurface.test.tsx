import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { chordManager } from '../music/ChordManager';
import { DEFAULT_OCTAVE_RANGE } from '../music/config';
import { SimpleTriadsSurface } from './SimpleTriadsSurface';

const mockHandleChordPointerDown = vi.fn();
const mockHandleSimpleTriadPointerDown = vi.fn();
const mockHandleChordPointerUp = vi.fn();

const mockChordContext = {
  tonalCenter: 10,
  selectedChord: null as { name: string } | null,
  activeSimpleTriadId: null as string | null,
  handleChordPointerDown: mockHandleChordPointerDown,
  handleSimpleTriadPointerDown: mockHandleSimpleTriadPointerDown,
  handleChordPointerUp: mockHandleChordPointerUp,
};

vi.mock('../context/ChordContext', () => ({
  useChordContext: () => mockChordContext,
}));

describe('SimpleTriadsSurface', () => {
  beforeEach(() => {
    mockHandleChordPointerDown.mockClear();
    mockHandleSimpleTriadPointerDown.mockClear();
    mockHandleChordPointerUp.mockClear();
    mockChordContext.tonalCenter = 10;
    mockChordContext.selectedChord = null;
    mockChordContext.activeSimpleTriadId = null;
    chordManager.configureTonalSpace(10, DEFAULT_OCTAVE_RANGE);
  });

  it('renders axis groups, parent vertices, and RN buttons', () => {
    const { container } = render(<SimpleTriadsSurface />);

    expect(container.querySelector('[data-simple-triads="true"]')).not.toBeNull();
    expect(container.textContent).toContain('Earth-Wind');
    expect(container.textContent).toContain('Earth-Fire');
    expect(container.textContent).toContain('Wind-Fire');

    for (const parent of ['Earth', 'Wind', 'Fire']) {
      const button = container.querySelector(`[data-simple-parent="${parent}"]`);
      expect(button).not.toBeNull();
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }

    expect(container.querySelector('[data-simple-triad="I"]')?.textContent).toContain('I');
    expect(container.querySelector('[data-simple-triad="vii_dim"]')?.textContent).toContain('vii°');
    expect(
      container.querySelector('[data-simple-triad="I"]')?.getAttribute('aria-label'),
    ).toContain('Bb');
  });

  it('plays a triad button and a parent vertex', () => {
    const { container } = render(<SimpleTriadsSurface />);
    const tonic = container.querySelector('[data-simple-triad="I"]')!;
    fireEvent.pointerDown(tonic);
    expect(mockHandleSimpleTriadPointerDown).toHaveBeenCalledWith('I');

    const earth = container.querySelector('[data-simple-parent="Earth"]')!;
    fireEvent.pointerDown(earth);
    expect(mockHandleChordPointerDown).toHaveBeenCalledTimes(1);
    expect(mockHandleChordPointerDown.mock.calls[0][0].name).toBe('Earth');
  });

  it('marks the active RN button as pressed', () => {
    mockChordContext.activeSimpleTriadId = 'V';
    mockChordContext.selectedChord = { name: 'Ember' };
    const { container } = render(<SimpleTriadsSurface />);
    expect(container.querySelector('[data-simple-triad="V"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(container.querySelector('[data-simple-triad="I"]')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(container.querySelector('[data-simple-parent="Earth"]')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
