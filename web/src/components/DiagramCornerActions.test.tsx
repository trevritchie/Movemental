/// <reference types="node" />
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiagramCornerActions } from './DiagramCornerActions';
import { audioEngine } from '../audio/AudioEngine';

const setPlayStyle = vi.fn();
const toggleFullscreen = vi.fn();
const dismissIosInstallHint = vi.fn();

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    releaseActiveNotes: vi.fn(),
    isRecordingSupported: vi.fn(() => true),
    startRecording: vi.fn(async () => undefined),
    stopRecording: vi.fn(async () => ({
      audio: new Blob(['test'], { type: 'audio/webm' }),
      midi: new Blob(['midi'], { type: 'audio/midi' }),
    })),
  },
}));

vi.mock('./RecordControl', () => ({
  RecordControl: () => (
    <button type="button" aria-label="Start recording">
      Record
    </button>
  ),
}));

vi.mock('../context/ChordContext', () => ({
  useChordContext: () => ({
    tonalCenter: 0,
    setTonalCenter: vi.fn(),
    octaveRange: 3,
    setOctaveRange: vi.fn(),
    borrowingMemory: 'per-chord',
    setBorrowingMemory: vi.fn(),
    playStyle: 'drone',
    setPlayStyle,
  }),
}));

vi.mock('../hooks/useLayoutTier', () => ({
  useLayoutTier: vi.fn(() => 'desktop'),
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

import { useLayoutTier } from '../hooks/useLayoutTier';
import { useFullscreen } from '../hooks/useFullscreen';

describe('DiagramCornerActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLayoutTier).mockReturnValue('desktop');
    vi.mocked(useFullscreen).mockReturnValue({
      isFullscreen: false,
      canFullscreen: true,
      showIosInstallHint: false,
      toggleFullscreen,
      dismissIosInstallHint,
    });
  });

  it('renders panic, settings, and fullscreen in diagram corners', () => {
    render(<DiagramCornerActions />);

    expect(
      screen.getByRole('button', { name: /start recording/i }),
    ).toBeInTheDocument();
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

  it('opens the settings sheet with play style on desktop', () => {
    render(<DiagramCornerActions />);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Play Style')).toBeInTheDocument();
    expect(screen.getByText('Tonal Center')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Tilt' })).not.toBeInTheDocument();
  });

  it('shows tilt play style on tablet', () => {
    vi.mocked(useLayoutTier).mockReturnValue('tablet');

    render(<DiagramCornerActions />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('option', { name: 'Tilt' })).toBeInTheDocument();
  });

  it('calls panic stop without opening the menu', () => {
    render(<DiagramCornerActions />);

    fireEvent.click(
      screen.getByRole('button', { name: /panic switch/i }),
    );

    expect(audioEngine.releaseActiveNotes).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls toggleFullscreen without opening the settings sheet', async () => {
    render(<DiagramCornerActions />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /full screen/i }),
      );
    });

    expect(toggleFullscreen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows iOS install hint on tablet when enabled', () => {
    vi.mocked(useLayoutTier).mockReturnValue('tablet');
    vi.mocked(useFullscreen).mockReturnValue({
      isFullscreen: false,
      canFullscreen: true,
      showIosInstallHint: true,
      toggleFullscreen,
      dismissIosInstallHint,
    });

    render(<DiagramCornerActions />);

    expect(screen.getByText(/Full Screen on iPhone/i)).toBeInTheDocument();
    expect(screen.getByText(/Share button, then Add to Home Screen/i)).toBeInTheDocument();
    expect(screen.queryByText(/Safari/i)).not.toBeInTheDocument();
  });

  it('does not show iOS install hint on desktop tier when enabled', () => {
    vi.mocked(useLayoutTier).mockReturnValue('desktop');
    vi.mocked(useFullscreen).mockReturnValue({
      isFullscreen: false,
      canFullscreen: true,
      showIosInstallHint: true,
      toggleFullscreen,
      dismissIosInstallHint,
    });

    render(<DiagramCornerActions />);

    expect(screen.queryByText(/Full Screen on iPhone/i)).not.toBeInTheDocument();
  });
});
