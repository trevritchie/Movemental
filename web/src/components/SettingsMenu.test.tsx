/// <reference types="node" />
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileActionButtons } from './SettingsMenu';
import { audioEngine } from '../audio/AudioEngine';

const setTonalCenter = vi.fn();
const setOctaveRange = vi.fn();
const setBorrowingMemory = vi.fn();
const setPlayStyle = vi.fn();
const toggleFullscreen = vi.fn();
const dismissIosInstallHint = vi.fn();

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    releaseActiveNotes: vi.fn(),
  },
}));

vi.mock('../context/ChordContext', () => ({
  useChordContext: () => ({
    tonalCenter: 0,
    setTonalCenter,
    octaveRange: 3,
    setOctaveRange,
    borrowingMemory: 'per-chord',
    setBorrowingMemory,
    playStyle: 'drone',
    setPlayStyle,
  }),
}));

vi.mock('../hooks/useLayoutTier', () => ({
  useLayoutTier: vi.fn(() => 'phone'),
}));

vi.mock('../hooks/useFullscreen', () => ({
  useFullscreen: vi.fn(() => ({
    isFullscreen: false,
    canFullscreen: true,
    showIosInstallHint: false,
    toggleFullscreen,
    dismissIosInstallHint,
  })),
}));

import { useFullscreen } from '../hooks/useFullscreen';

describe('MobileActionButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFullscreen).mockReturnValue({
      isFullscreen: false,
      canFullscreen: true,
      showIosInstallHint: false,
      toggleFullscreen,
      dismissIosInstallHint,
    });
  });

  it('renders stop, settings, and fullscreen in the action column', () => {
    render(<MobileActionButtons />);

    expect(
      screen.getByRole('button', { name: /panic switch/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /full screen/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the settings sheet with tonal center and borrowing memory', () => {
    render(<MobileActionButtons />);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Tonal Center')).toBeInTheDocument();
    expect(screen.getByText('Voice Borrowing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /per chord/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^global$/i })).toBeInTheDocument();
  });

  it('calls panic stop without opening the menu', () => {
    render(<MobileActionButtons />);

    fireEvent.click(
      screen.getByRole('button', { name: /panic switch/i }),
    );

    expect(audioEngine.releaseActiveNotes).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls toggleFullscreen without opening the settings sheet', async () => {
    render(<MobileActionButtons />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /full screen/i }),
      );
    });

    expect(toggleFullscreen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the sheet on Escape', () => {
    render(<MobileActionButtons />);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows iOS install hint near the action column on iPhone', () => {
    vi.mocked(useFullscreen).mockReturnValue({
      isFullscreen: false,
      canFullscreen: true,
      showIosInstallHint: true,
      toggleFullscreen,
      dismissIosInstallHint,
    });

    render(<MobileActionButtons />);

    expect(screen.getByText(/Full Screen on iPhone/i)).toBeInTheDocument();
    expect(screen.getByText(/Share button, then Add to Home Screen/i)).toBeInTheDocument();
  });
});
