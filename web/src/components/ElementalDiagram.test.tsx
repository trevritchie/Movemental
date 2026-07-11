import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ElementalDiagram } from './ElementalDiagram';

vi.mock('./tour/tourContext', () => ({
  useTour: () => ({
    startTour: vi.fn(),
    hasCompletedTour: false,
  }),
}));

// Idle diagram: no selected chord, borrowing off, tilt unsupported.
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
    playStyle: 'drone',
    noTiltVoicingLevel: 0,
    setNoTiltVoicingLevel: vi.fn(),
    noTiltPositionLevel: 4,
    setNoTiltPositionLevel: vi.fn(),
    tonalCenter: 0,
    octaveRange: 3,
    previousPlayedChord: null,
    isNoTiltVoicingLocked: false,
    isNoTiltBassLocked: false,
    toggleNoTiltVoicingLock: vi.fn(),
    toggleNoTiltBassLock: vi.fn(),
    tiltModeEnabled: false,
  }),
}));

import type { LayoutTier } from '../layout/breakpoints';

const mockUseLayoutTier = vi.fn((): LayoutTier => 'phone');

vi.mock('../hooks/useLayoutTier', () => ({
  useLayoutTier: () => mockUseLayoutTier(),
}));

vi.mock('../context/TiltReadoutContext', () => ({
  useTiltReadoutContext: () => ({
    tiltStatus: 'unsupported',
    tiltSample: { x: 0, y: 0 },
    orientationRef: { current: { gamma: 0, beta: 0 } },
    requestTiltPermission: vi.fn(),
  }),
}));

vi.mock('../hooks/useFullscreen', () => ({
  useFullscreen: () => ({
    isFullscreen: false,
    canFullscreen: true,
    showIosInstallHint: false,
    toggleFullscreen: vi.fn(),
    dismissIosInstallHint: vi.fn(),
  }),
}));

vi.mock('./RecordControl', () => ({
  RecordControl: () => null,
}));

// ElementalDiagram fades in after rAF settles layout measurements.
async function flushAnimationFrames(count = 2): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
}

describe('ElementalDiagram ready gate', () => {
  it('should hide diagram until layout settles after mount', async () => {
    mockUseLayoutTier.mockReturnValue('phone');
    const { container } = render(<ElementalDiagram />);
    const diagram = container.querySelector('.diagram-container');

    expect(diagram).not.toBeNull();
    expect(diagram).toHaveStyle({ opacity: '0' });

    await flushAnimationFrames(2);

    await waitFor(() => {
      expect(diagram).toHaveStyle({ opacity: '1' });
    });
  });

  it('should render voicing overlay on all layout tiers', async () => {
    mockUseLayoutTier.mockReturnValue('phone');
    const { container, unmount } = render(<ElementalDiagram />);
    await flushAnimationFrames(2);
    await waitFor(() => {
      expect(
        container.querySelector('.diagram-voicing-overlay'),
      ).not.toBeNull();
    });
    unmount();

    mockUseLayoutTier.mockReturnValue('desktop');
    const desktop = render(<ElementalDiagram />);
    await flushAnimationFrames(2);
    await waitFor(() => {
      expect(
        desktop.container.querySelector('.diagram-voicing-overlay'),
      ).not.toBeNull();
      expect(
        desktop.container.querySelector('.diagram-corner-actions'),
      ).not.toBeNull();
    });
    expect(
      desktop.container.querySelector('.mobile-action-buttons'),
    ).toBeNull();
  });

  it('renders background orbs behind the svg without intercepting pointer events', async () => {
    mockUseLayoutTier.mockReturnValue('phone');
    const { container } = render(<ElementalDiagram />);
    await flushAnimationFrames(2);

    const diagram = container.querySelector('.diagram-container');
    const orbs = container.querySelector('.diagram-background-orbs');
    const svg = container.querySelector('.diagram-svg');

    expect(diagram).not.toBeNull();
    expect(orbs).not.toBeNull();
    expect(svg).not.toBeNull();
    expect(diagram!.firstElementChild).toBe(orbs);
    expect(orbs!.compareDocumentPosition(svg!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(orbs).toHaveAttribute('aria-hidden', 'true');
  });
});
