/// <reference types="node" />
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { MobileActionButtons } from './AppToolbar';
import { audioEngine } from '../audio/AudioEngine';

const setTonalCenter = vi.fn();
const setOctaveRange = vi.fn();
const setBorrowingMemory = vi.fn();
const setPlayStyle = vi.fn();
const setClockLayoutMode = vi.fn();
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
    setTonalCenter,
    octaveRange: 3,
    setOctaveRange,
    borrowingMemory: 'per-chord',
    setBorrowingMemory,
    playStyle: 'tap',
    setPlayStyle,
    clockLayoutMode: 'chromatic',
    setClockLayoutMode,
    glowingOrbsEnabled: true,
    setGlowingOrbsEnabled: vi.fn(),
    retriggerSoundingNotes: false,
    setRetriggerSoundingNotes: vi.fn(),
    tiltModeEnabled: false,
    resetSettingsGroup: vi.fn(),
    resetAllSettings: vi.fn(),
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
  useLayoutTier: vi.fn(() => 'phone'),
}));

vi.mock('./tour/tourContext', () => ({
  useTour: () => ({
    startTour: vi.fn(),
    hasCompletedTour: false,
  }),
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
  isIphone: vi.fn(() => true),
}));

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

describe('MobileActionButtons', () => {
  beforeAll(async () => {
    await import('./SettingsModal');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isIphone).mockReturnValue(true);
    vi.mocked(useFullscreen).mockReturnValue(mockFullscreenState());
  });

  it('renders stop, settings, and help in the action column', () => {
    render(<MobileActionButtons />);

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

  it('opens the settings sheet with tonal center and borrowing memory', async () => {
    render(<MobileActionButtons />);

    await openSettingsFromToolbar();
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(
      within(dialog).queryByText(/How Movemental works and interactive tour/i),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: /full screen/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tonal Center')).toBeInTheDocument();
    expect(screen.getByText('Voice Borrowing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /per chord/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^global$/i })).toBeInTheDocument();
  });

  it('lists settings with grouped sections and per-setting reset buttons', async () => {
    render(<MobileActionButtons />);

    await openSettingsFromToolbar();
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    const text = dialog.textContent ?? '';
    const audioIndex = text.indexOf('Audio');
    const tonalCenterIndex = text.indexOf('Tonal Center');
    const instrumentIndex = text.indexOf('Instrument');
    const eqIndex = text.indexOf('EQ');
    const playStyleIndex = text.indexOf('Play Style');
    const holdModeIndex = text.indexOf('Sustain Mode');
    const voiceLeadingIndex = text.indexOf('Voice Leading');
    const visualsIndex = text.indexOf('Visuals');
    const clockFaceIndex = text.indexOf('Clock Face Diagram');
    const glowingOrbsIndex = text.indexOf('Glowing Orbs');

    expect(audioIndex).toBeGreaterThan(-1);
    expect(tonalCenterIndex).toBeGreaterThan(audioIndex);
    expect(instrumentIndex).toBeGreaterThan(tonalCenterIndex);
    expect(eqIndex).toBeGreaterThan(instrumentIndex);
    expect(playStyleIndex).toBeGreaterThan(eqIndex);
    expect(holdModeIndex).toBeGreaterThan(playStyleIndex);
    expect(voiceLeadingIndex).toBeGreaterThan(holdModeIndex);
    expect(visualsIndex).toBeGreaterThan(voiceLeadingIndex);
    expect(clockFaceIndex).toBeGreaterThan(visualsIndex);
    expect(glowingOrbsIndex).toBeGreaterThan(clockFaceIndex);
    expect(screen.queryByText('Sound')).not.toBeInTheDocument();
    expect(screen.queryByText('Playback')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /reset .* to defaults/i }).length,
    ).toBeGreaterThanOrEqual(8);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Play Style' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 4, name: 'Voice Leading' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /^off$/i }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole('button', { name: /^on$/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('opens help directly from the toolbar without showing settings', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();

    expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();
    expect(screen.queryByText('Tonal Center')).not.toBeInTheDocument();
    expect(screen.getByText(/How Movemental works/i)).toBeInTheDocument();
  });

  it('opens help from the toolbar Help button', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();

    expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();
    expect(screen.getByText(/How Movemental works/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Harmonic Theory' }))
      .toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /creation theory/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /borrowing from the neighbors/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /elevator system/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start interactive tour/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/borrow from the neighbor/i)).toBeInTheDocument();
    expect(screen.getByText(/elevator floors/i)).toBeInTheDocument();
    expect(screen.getByText(/Base, Brother, Twin, Sister/i)).toBeInTheDocument();
  });

  it('opens creation theory with Barry Harris credit and video link', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();
    fireEvent.click(screen.getByRole('button', { name: /creation theory/i }));

    expect(
      screen.getByRole('dialog', { name: 'Creation Theory' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Barry Harris/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /watch reference video on youtube/i,
      }),
    ).toHaveAttribute('href', 'https://www.youtube.com/shorts/OmWSgjwroLM');
    expect(screen.getByRole('heading', { name: /two diminished parents/i }))
      .toBeInTheDocument();
    expect(screen.getByText(/carrying DNA from both parents/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Earth, Wind, and Fire/i).length)
      .toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Base, Brother, Twin/i)).toBeInTheDocument();
    expect(screen.getAllByText(/scale of chords/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/neighbor is the opposite vertex/i)).toBeInTheDocument();
    expect(screen.getByText(/not a parent of the child/i)).toBeInTheDocument();
    expect(screen.getByText(/brother-and-sister pattern appears for those qualities/i))
      .toBeInTheDocument();
    expect(screen.getByText(/each circle is one chord quality/i)).toBeInTheDocument();
    expect(screen.getByText(/one half step/i)).toBeInTheDocument();
    expect(screen.getByText(/whole-tone scales/i)).toBeInTheDocument();
    expect(screen.getByText(/twelve notes of the chromatic scale/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^In Movemental/i).length).toBeGreaterThanOrEqual(2);
  });

  it('opens borrowing from the neighbors with Barry Harris credit and video link', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();
    fireEvent.click(
      screen.getByRole('button', { name: /borrowing from the neighbors/i }),
    );

    expect(
      screen.getByRole('dialog', { name: 'Borrowing from the Neighbors' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Barry Harris/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /watch reference video on youtube/i,
      }),
    ).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=eRgvvbGuwLo&t=172s',
    );
    expect(screen.getAllByText(/neighbor/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/^On chord:/i)).toBeInTheDocument();
    expect(screen.getByText(/^Off chord:/i)).toBeInTheDocument();
    expect(screen.getByText(/eight related harmonies/i)).toBeInTheDocument();
    expect(screen.getByText(/Branch is an Earth-Wind child/i)).toBeInTheDocument();
    expect(screen.getByText(/neighbor is Fire/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^In Movemental/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Drag up or down to borrow/i)).toBeInTheDocument();
  });

  it('returns to help hub from borrowing neighbors via back', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();
    fireEvent.click(
      screen.getByRole('button', { name: /borrowing from the neighbors/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: /back to help/i }));

    expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /borrowing from the neighbors/i }),
    ).toBeInTheDocument();
  });

  it('opens elevator system with Thomas Echols credit and video link', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();
    fireEvent.click(screen.getByRole('button', { name: /elevator system/i }));

    expect(
      screen.getByRole('dialog', { name: 'Elevator System' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Thomas Echols/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Labyrinth of Limitations' }),
    ).toHaveAttribute('href', 'https://www.youtube.com/@LabyrinthofLimitations');
    expect(
      screen.getByRole('link', {
        name: /watch reference video on youtube/i,
      }),
    ).toHaveAttribute('href', 'https://www.youtube.com/watch?v=qYoSZqWLh7E');
    expect(screen.getAllByText(/^In Movemental/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/roll your phone left or right/i)).toBeInTheDocument();
    expect(screen.getByText(/Unison toward Triad/i)).toBeInTheDocument();
  });

  it('returns to help hub from a theory article via back', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();
    fireEvent.click(screen.getByRole('button', { name: /creation theory/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to help/i }));

    expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Harmonic Theory' }))
      .toBeInTheDocument();
  });

  it('returns from theory article to help hub on Escape before closing', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();
    fireEvent.click(screen.getByRole('button', { name: /elevator system/i }));
    expect(
      screen.getByRole('dialog', { name: 'Elevator System' }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes help hub on Escape when opened from toolbar', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();
    expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls panic stop without opening the menu', () => {
    render(<MobileActionButtons />);

    fireEvent.click(
      screen.getByRole('button', { name: /panic switch/i }),
    );

    expect(audioEngine.releaseActiveNotes).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls toggleFullscreen from settings without opening help', async () => {
    render(<MobileActionButtons />);

    await openSettingsFromToolbar();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /full screen/i }),
      );
    });

    expect(toggleFullscreen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  });

  it('closes the sheet on Escape', async () => {
    render(<MobileActionButtons />);

    await openSettingsFromToolbar();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps keyboard focus inside the settings dialog on Tab', async () => {
    render(<MobileActionButtons />);

    await openSettingsFromToolbar();
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    const focusable = dialog.querySelectorAll(
      'button:not([disabled]), select:not([disabled])',
    );
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('shows iOS install hint when Full Screen is tapped on iPhone', async () => {
    vi.mocked(isIphone).mockReturnValue(true);
    vi.mocked(useFullscreen).mockReturnValue(
      mockFullscreenState({ showIosInstallHint: true }),
    );

    render(<MobileActionButtons />);
    await openSettingsFromToolbar();

    expect(screen.getByText(/Full Screen on iPhone/i)).toBeInTheDocument();
    expect(screen.getByText(/Share button, then Add to Home Screen/i)).toBeInTheDocument();
  });

  it('does not show iOS install hint when settings are closed on iPhone', () => {
    vi.mocked(isIphone).mockReturnValue(true);
    vi.mocked(useFullscreen).mockReturnValue(
      mockFullscreenState({ showIosInstallHint: true }),
    );

    render(<MobileActionButtons />);

    expect(screen.queryByText(/Full Screen on iPhone/i)).not.toBeInTheDocument();
  });

  it('does not show iOS install hint when not on iPhone', () => {
    vi.mocked(isIphone).mockReturnValue(false);
    vi.mocked(useFullscreen).mockReturnValue(
      mockFullscreenState({ showIosInstallHint: true }),
    );

    render(<MobileActionButtons />);

    expect(screen.queryByText(/Full Screen on iPhone/i)).not.toBeInTheDocument();
  });
});
