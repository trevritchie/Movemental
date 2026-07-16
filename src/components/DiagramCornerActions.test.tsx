/// <reference types="node" />
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
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

vi.mock('./tour/tourContext', () => ({
  useTour: () => ({
    startTour: vi.fn(),
    hasCompletedTour: false,
  }),
}));

vi.mock('../context/ChordContext', () => ({
  useChordContext: () => ({
    tonalCenter: 0,
    setTonalCenter: vi.fn(),
    octaveRange: 3,
    setOctaveRange: vi.fn(),
    borrowingMemory: 'per-chord',
    setBorrowingMemory: vi.fn(),
    playStyle: 'tap',
    setPlayStyle,
  }),
}));

vi.mock('../context/SoundDesignContext', () => ({
  useSoundDesignContext: () => ({
    synthPresetId: 'warmPad',
    setSynthPresetId: vi.fn(),
    synthPresetLoading: false,
    synthPresets: [{ id: 'warmPad', name: 'Warm Pad' }],
    eqProfileId: 'smallSpeakers',
    setEqProfileId: vi.fn(),
    isSamplerInstrumentActive: false,
    isSamplerAdsrDisabled: false,
    chorusWet: 0.35,
    setChorusWet: vi.fn(),
    delayWet: 0,
    setDelayWet: vi.fn(),
    reverbWet: 0.3,
    setReverbWet: vi.fn(),
    envelopeAttack: 0.15,
    setEnvelopeAttack: vi.fn(),
    envelopeDecay: 2.0,
    setEnvelopeDecay: vi.fn(),
    envelopeSustain: 0.5,
    setEnvelopeSustain: vi.fn(),
    envelopeRelease: 2.5,
    setEnvelopeRelease: vi.fn(),
    tapAttack: 0.15,
    setTapAttack: vi.fn(),
    tapDecay: 2.0,
    setTapDecay: vi.fn(),
    tapSustain: 0.5,
    setTapSustain: vi.fn(),
    tapRelease: 2.5,
    setTapRelease: vi.fn(),
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

vi.mock('../utils/devicePlatform', () => ({
  isIphone: vi.fn(() => false),
}));

import { useLayoutTier } from '../hooks/useLayoutTier';
import { useFullscreen } from '../hooks/useFullscreen';
import { isIphone } from '../utils/devicePlatform';

function mockFullscreenState(
  overrides: Partial<ReturnType<typeof useFullscreen>> = {},
) {
  return {
    isFullscreen: false,
    canFullscreen: true,
    showIosInstallHint: false,
    toggleFullscreen,
    dismissIosInstallHint,
    ...overrides,
  };
}

async function openHelpFromToolbar() {
  fireEvent.click(screen.getByRole('button', { name: 'Help' }));
  await waitFor(
    () => {
      expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();
    },
    { timeout: 3000 },
  );
}

async function openSettingsFromToolbar() {
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await waitFor(
    () => {
      expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    },
    { timeout: 3000 },
  );
}

describe('DiagramCornerActions', () => {
  beforeAll(async () => {
    await import('./SettingsModal');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLayoutTier).mockReturnValue('desktop');
    vi.mocked(isIphone).mockReturnValue(false);
    vi.mocked(useFullscreen).mockReturnValue(mockFullscreenState());
  });

  it('renders panic, settings, and help in diagram corners', () => {
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
      screen.getByRole('button', { name: 'Help' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the settings sheet with play style on desktop', async () => {
    render(<DiagramCornerActions />);

    await openSettingsFromToolbar();

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Play Style')).toBeInTheDocument();
    expect(screen.getByText('Tonal Center')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /full screen/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Tilt' })).not.toBeInTheDocument();
  });

  it('opens Help dialog directly from the toolbar', async () => {
    render(<DiagramCornerActions />);

    await openHelpFromToolbar();

    expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();
    expect(screen.queryByText('Tonal Center')).not.toBeInTheDocument();
    expect(screen.getByText(/How Movemental works/i)).toBeInTheDocument();
  });

  it('shows tap and tap-and-hold play styles on tablet', async () => {
    vi.mocked(useLayoutTier).mockReturnValue('tablet');

    render(<DiagramCornerActions />);
    await openSettingsFromToolbar();

    expect(screen.getByRole('button', { name: 'Tap' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /tap & hold/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^click$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /click & hold/i }),
    ).not.toBeInTheDocument();
  });

  it('calls panic stop without opening the menu', () => {
    render(<DiagramCornerActions />);

    fireEvent.click(
      screen.getByRole('button', { name: /panic switch/i }),
    );

    expect(audioEngine.releaseActiveNotes).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls toggleFullscreen from settings without opening help', async () => {
    render(<DiagramCornerActions />);

    await openSettingsFromToolbar();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /full screen/i }),
      );
    });

    expect(toggleFullscreen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  });

  it('shows iOS install hint in settings on iPhone when enabled', async () => {
    vi.mocked(isIphone).mockReturnValue(true);
    vi.mocked(useFullscreen).mockReturnValue(
      mockFullscreenState({ showIosInstallHint: true }),
    );

    render(<DiagramCornerActions />);
    await openSettingsFromToolbar();

    expect(screen.getByText(/Full Screen on iPhone/i)).toBeInTheDocument();
    expect(screen.getByText(/Share button, then Add to Home Screen/i)).toBeInTheDocument();
    expect(screen.queryByText(/Safari/i)).not.toBeInTheDocument();
  });

  it('does not show iOS install hint on desktop tier when enabled', () => {
    vi.mocked(useLayoutTier).mockReturnValue('desktop');
    vi.mocked(useFullscreen).mockReturnValue(
      mockFullscreenState({ showIosInstallHint: true }),
    );

    render(<DiagramCornerActions />);

    expect(screen.queryByText(/Full Screen on iPhone/i)).not.toBeInTheDocument();
  });
});
