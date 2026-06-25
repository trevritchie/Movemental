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
    playStyle: 'drone',
    noTiltVoicingLevel: 0,
    setNoTiltVoicingLevel: vi.fn(),
    noTiltPositionLevel: 4,
    setNoTiltPositionLevel: vi.fn(),
    tonalCenter: 0,
    octaveRange: 3,
    previousPlayedChord: null,
    tiltStatus: 'unsupported',
    tiltSample: { roll: 0, pitch: 0 },
    requestTiltPermission: vi.fn(),
    isNoTiltVoicingLocked: false,
    isNoTiltBassLocked: false,
    toggleNoTiltVoicingLock: vi.fn(),
    toggleNoTiltBassLock: vi.fn(),
  }),
}));

import type { LayoutTier } from '../layout/breakpoints';

const mockUseLayoutTier = vi.fn((): LayoutTier => 'phone');

vi.mock('../hooks/useLayoutTier', () => ({
  useLayoutTier: () => mockUseLayoutTier(),
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
});
