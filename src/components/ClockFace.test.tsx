import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClockFace } from './ClockFace';
import type { ClockLayoutMode } from '../context/types';
import {
  clockSlotToAngle,
  relativePcToClockSlot,
} from '../music/clockLayout';

const CLOCK_RADIUS = 108;
const CLOCK_CX = 150;
const CLOCK_CY = 155;

const branchChord = {
  name: 'Branch',
  traditionalName: 'Bb maj6 / G min7',
  quality: ' maj6',
  pitches: [10, 2, 5, 7],
  originalPitches: [0, 4, 7, 9],
  rootPositionIndex: 0,
};

const mockContext: {
  tonalCenter: number;
  activePitches: number[];
  selectedChord: typeof branchChord;
  clockLayoutMode: ClockLayoutMode;
} = {
  tonalCenter: 10,
  activePitches: [58, 62, 65, 69],
  selectedChord: branchChord,
  clockLayoutMode: 'chromatic',
};

vi.mock('../context/ChordContext', () => ({
  useChordContext: vi.fn(() => mockContext),
}));

import { useChordContext } from '../context/ChordContext';

function nodeCoordinatesForPitch(
  pitch: number,
  tonalCenter: number,
  mode: 'chromatic' | 'circle_of_fifths'
): { cx: number; cy: number } {
  const relPc = ((pitch % 12) + 12) % 12;
  const adjustedRelPc = (relPc - tonalCenter + 12) % 12;
  const slot = relativePcToClockSlot(adjustedRelPc, mode);
  const angle = clockSlotToAngle(slot);
  return {
    cx: CLOCK_CX + CLOCK_RADIUS * Math.cos(angle),
    cy: CLOCK_CY + CLOCK_RADIUS * Math.sin(angle),
  };
}

describe('ClockFace empty state', () => {
  beforeEach(() => {
    vi.mocked(useChordContext).mockReturnValue({
      ...mockContext,
      selectedChord: null,
      activePitches: [],
    } as never);
  });

  it('shows placeholder readout and an unhighlighted clock before the first chord', () => {
    const { container: desktop } = render(<ClockFace />);
    const desktopInfo = desktop.querySelector('.clock-info');
    expect(desktop.querySelector('.clock-svg')).toBeInTheDocument();
    expect(desktopInfo?.querySelector('.elemental-name')?.textContent).toBe(
      'Select a Chord',
    );
    expect(desktopInfo?.querySelector('.chemistry-formula')?.textContent).toBe(
      '---',
    );
    expect(desktopInfo?.querySelector('.traditional-name')?.textContent).toBe(
      '---',
    );
    expect(desktopInfo?.querySelector('.playing-notes')).toBeNull();
    expect(desktop.querySelectorAll('.clock-svg circle[r="8"]')).toHaveLength(
      0,
    );

    const { container: mobile } = render(<ClockFace isMobileOverlay />);
    const mobileInfo = mobile.querySelector('.clock-info');
    expect(mobile.querySelector('.clock-svg')).toBeInTheDocument();
    expect(mobileInfo?.querySelector('.elemental-name')?.textContent).toBe(
      'Select a Chord',
    );
    expect(mobileInfo?.querySelector('.chemistry-formula')?.textContent).toBe(
      '---',
    );
    expect(mobileInfo?.querySelector('.traditional-name')?.textContent).toBe(
      '---',
    );
    expect(mobileInfo?.querySelector('.playing-notes')?.textContent).toBe(
      '---',
    );
    expect(mobile.querySelectorAll('.clock-svg circle[r="8"]')).toHaveLength(
      0,
    );
  });
});

describe('ClockFace playing notes readout', () => {
  beforeEach(() => {
    mockContext.clockLayoutMode = 'chromatic';
    vi.mocked(useChordContext).mockReturnValue(mockContext as never);
  });

  it('shows inline traditional name and notes on desktop', () => {
    const { container } = render(<ClockFace />);
    expect(screen.getByText('Bb maj6 / G min7 - Bb3 D4 F4 A4')).toBeInTheDocument();
    expect(container.querySelector('.playing-notes')).toBeNull();
  });

  it('shows playing notes on a separate row on mobile overlay', () => {
    const { container } = render(<ClockFace isMobileOverlay />);
    expect(container.querySelector('.diagram-chord-readout')).toBeInTheDocument();
    expect(container.querySelector('.diagram-chord-readout__sizer')).toBeInTheDocument();
    expect(container.querySelector('.diagram-overlay-pill')).toBeNull();
    const clockInfo = container.querySelector('.clock-info');
    expect(clockInfo?.querySelector('.traditional-name')?.textContent).toBe(
      'Bb maj6 / G min7'
    );
    expect(clockInfo?.querySelector('.playing-notes')?.textContent).toBe(
      'Bb3 D4 F4 A4'
    );
  });
});

describe('ClockFace layout modes', () => {
  beforeEach(() => {
    vi.mocked(useChordContext).mockReturnValue(mockContext as never);
  });

  it('renders chromatic note labels at tonal center Bb', () => {
    mockContext.clockLayoutMode = 'chromatic';
    const { container } = render(<ClockFace />);
    const labels = Array.from(container.querySelectorAll('.clock-svg text')).map(
      (node) => node.textContent
    );
    expect(labels).toEqual([
      'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A',
    ]);
  });

  it('renders circle-of-fifths note labels at tonal center Bb', () => {
    mockContext.clockLayoutMode = 'circle_of_fifths';
    const { container } = render(<ClockFace />);
    const labels = Array.from(container.querySelectorAll('.clock-svg text')).map(
      (node) => node.textContent
    );
    expect(labels.slice(0, 6)).toEqual(['Bb', 'F', 'C', 'G', 'D', 'A']);
  });

  it('positions active nodes on chromatic slots', () => {
    mockContext.clockLayoutMode = 'chromatic';
    const { container } = render(<ClockFace />);
    const activeNodes = container.querySelectorAll('.clock-svg circle[r="8"]');
    expect(activeNodes).toHaveLength(4);

    for (const pitch of mockContext.activePitches) {
      const expected = nodeCoordinatesForPitch(pitch, mockContext.tonalCenter, 'chromatic');
      const match = Array.from(activeNodes).find(
        (node) =>
          Number(node.getAttribute('cx')).toFixed(3) === expected.cx.toFixed(3) &&
          Number(node.getAttribute('cy')).toFixed(3) === expected.cy.toFixed(3)
      );
      expect(match).toBeTruthy();
    }
  });

  it('positions active nodes on circle-of-fifths slots', () => {
    mockContext.clockLayoutMode = 'circle_of_fifths';
    const { container } = render(<ClockFace />);
    const activeNodes = container.querySelectorAll('.clock-svg circle[r="8"]');
    expect(activeNodes).toHaveLength(4);

    for (const pitch of mockContext.activePitches) {
      const expected = nodeCoordinatesForPitch(
        pitch,
        mockContext.tonalCenter,
        'circle_of_fifths'
      );
      const match = Array.from(activeNodes).find(
        (node) =>
          Number(node.getAttribute('cx')).toFixed(3) === expected.cx.toFixed(3) &&
          Number(node.getAttribute('cy')).toFixed(3) === expected.cy.toFixed(3)
      );
      expect(match).toBeTruthy();
    }
  });
});
