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
    voicingElevatorFloorsMode: 'all',
    setVoicingElevatorFloorsMode: vi.fn(),
    glowingOrbsEnabled: true,
    setGlowingOrbsEnabled: vi.fn(),
    harmonicFunctionLabelsEnabled: true,
    setHarmonicFunctionLabelsEnabled: vi.fn(),
    diagramLayoutMode: 'complete_geometry',
    setDiagramLayoutMode: vi.fn(),
    retriggerSoundingNotes: false,
    setRetriggerSoundingNotes: vi.fn(),
    tiltToStrum: false,
    setTiltToStrum: vi.fn(),
    shortestNote: '8n',
    setShortestNote: vi.fn(),
    bpm: 120,
    setBpm: vi.fn(),
    tiltModeEnabled: false,
    resetSettingsGroup: vi.fn(),
    resetAllSettings: vi.fn(),
    panicStop: vi.fn(() => {
      audioEngine.releaseActiveNotes();
    }),
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

  it(
    'opens the settings sheet with tonal center and borrowing memory',
    async () => {
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
  }, 10000);

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
    const layoutIndex = text.indexOf('Layout');
    const holdModeIndex = text.indexOf('Sustain Mode');
    const voiceLeadingIndex = text.indexOf('Voice Leading');
    const visualsIndex = text.indexOf('Visuals');
    const clockFaceIndex = text.indexOf('Clock Face Diagram');
    const glowingOrbsIndex = text.indexOf('Glowing Orbs');
    const harmonicFunctionLabelsIndex = text.indexOf(
      'Harmonic Function Labels',
    );

    expect(audioIndex).toBeGreaterThan(-1);
    expect(tonalCenterIndex).toBeGreaterThan(audioIndex);
    expect(instrumentIndex).toBeGreaterThan(tonalCenterIndex);
    expect(eqIndex).toBeGreaterThan(instrumentIndex);
    expect(playStyleIndex).toBeGreaterThan(eqIndex);
    expect(layoutIndex).toBeGreaterThan(playStyleIndex);
    expect(holdModeIndex).toBeGreaterThan(layoutIndex);
    expect(voiceLeadingIndex).toBeGreaterThan(holdModeIndex);
    expect(visualsIndex).toBeGreaterThan(voiceLeadingIndex);
    expect(glowingOrbsIndex).toBeGreaterThan(visualsIndex);
    expect(clockFaceIndex).toBeGreaterThan(glowingOrbsIndex);
    expect(harmonicFunctionLabelsIndex).toBeGreaterThan(clockFaceIndex);
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
    expect(screen.getByText(/How to Play/i)).toBeInTheDocument();
  });

  it('opens help from the toolbar Help button', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();

    expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();
    expect(screen.getByText(/How to Play/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Harmonic Theory' }))
      .toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /creation theory/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /applied to movemental/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /elevator system/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start interactive tour/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/borrow from the neighbor/i)).toBeInTheDocument();
    expect(screen.getByText(/elevator floors/i)).toBeInTheDocument();
    expect(screen.getByText(/sibling slices/i)).toBeInTheDocument();
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
        name: /Succinct demonstration - Chris Parks/i,
      }),
    ).toHaveAttribute('href', 'https://youtube.com/shorts/NWT86jDvUPQ');
    expect(
      screen.getByRole('link', {
        name: /Succinct demonstration - Thomas Echols/i,
      }),
    ).toHaveAttribute('href', 'https://www.youtube.com/shorts/OmWSgjwroLM');
    expect(screen.getByRole('heading', { name: /1\. The Chromatic Scale/i }))
      .toBeInTheDocument();
    expect(screen.getByText(/The Book of Genesis/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Earth, Wind, and Fire/i).length)
      .toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Base, Brother, Twin/i)).toBeInTheDocument();
    expect(screen.getAllByText(/scale of chords/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/untouched third diminished chord is the Neighbor/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Major 6th/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/half step/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/whole-tone scales/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/twelve pitch classes/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^In Movemental/i).length).toBeGreaterThanOrEqual(2);
  });


  it('opens applied to movemental with lineage, sliders, and elevator applications', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();
    fireEvent.click(
      screen.getByRole('button', { name: /applied to movemental/i }),
    );

    expect(
      screen.getByRole('dialog', { name: 'Applied to Movemental' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Dr\. Barry Harris/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Thomas Echols/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('heading', { name: /1\. The Elemental Triangle/i }))
      .toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /2\. Borrowing Sliders/i }))
      .toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /3\. VOICING and Relative Motion/i }))
      .toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /4\. Smooth Voice Leading/i }))
      .toBeInTheDocument();
  });

  it('returns to help hub from applied to movemental via back', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();
    fireEvent.click(
      screen.getByRole('button', { name: /applied to movemental/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: /back to help/i }));

    expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /applied to movemental/i }),
    ).toBeInTheDocument();
  });

  it('opens elevator system with Thomas Echols credit and video link', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();
    fireEvent.click(screen.getByRole('button', { name: /elevator system/i }));

    expect(
      screen.getByRole('dialog', { name: 'The Elevator System' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Thomas Echols/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Labyrinth of Limitations' }),
    ).toHaveAttribute('href', 'https://www.youtube.com/@LabyrinthofLimitations');
    expect(
      screen.getByRole('link', {
        name: /Episode 16: The Elevator Sequence/i,
      }),
    ).toHaveAttribute('href', 'https://www.youtube.com/watch?v=qYoSZqWLh7E');
    expect(screen.getByText(/Floor 1: Unison/i)).toBeInTheDocument();
    expect(screen.getByText(/Floor 9: Double Octave Chords/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Contrary motion/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Parallel \(direct\) motion/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Oblique motion/i).length).toBeGreaterThanOrEqual(1);
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
      screen.getByRole('dialog', { name: 'The Elevator System' }),
    ).toBeInTheDocument();

    fireEvent(screen.getByRole('dialog'), new Event('cancel'));
    expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();

    fireEvent(screen.getByRole('dialog'), new Event('cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes help hub on Escape when opened from toolbar', async () => {
    render(<MobileActionButtons />);

    await openHelpFromToolbar();
    expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();

    fireEvent(screen.getByRole('dialog'), new Event('cancel'));
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

    fireEvent(screen.getByRole('dialog'), new Event('cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
