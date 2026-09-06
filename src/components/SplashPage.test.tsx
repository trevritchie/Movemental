/// <reference types="node" />
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SplashPage } from './SplashPage';
import {
  unlockIosMediaChannel,
  waitForIosMediaChannel,
} from '../audio/iosMediaChannel';
import { audioEngine } from '../audio/AudioEngine';
import { useLayoutTier } from '../hooks/useLayoutTier';

vi.mock('../audio/iosMediaChannel', () => ({
  unlockIosMediaChannel: vi.fn(),
  waitForIosMediaChannel: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    startContext: vi.fn().mockResolvedValue(undefined),
  },
}));

const enterTiltSession = vi.fn();
const enterNoTiltSession = vi.fn();
const setTiltToStrum = vi.fn();
const requestTiltPermission = vi.fn().mockResolvedValue(undefined);

let mockChordContextState = {
  enterTiltSession,
  enterNoTiltSession,
  setTiltToStrum,
  tiltModeEnabled: true,
  hasPersistedSettings: false,
};

vi.mock('../context/ChordContext', () => ({
  useChordContext: () => mockChordContextState,
}));

vi.mock('../context/TiltReadoutContext', () => ({
  useTiltReadoutContext: () => ({ requestTiltPermission }),
}));

vi.mock('../hooks/useLayoutTier', () => ({
  useLayoutTier: vi.fn(() => 'desktop'),
}));

async function flushSplashEnterTimers(): Promise<void> {
  await act(async () => {
    await vi.runAllTimersAsync();
  });
}

describe('SplashPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(useLayoutTier).mockReturnValue('desktop');
    mockChordContextState = {
      enterTiltSession,
      enterNoTiltSession,
      setTiltToStrum,
      tiltModeEnabled: true,
      hasPersistedSettings: false,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('unlocks iOS media channel and starts audio on Start click (desktop)', async () => {
    const onEnter = vi.fn();
    render(<SplashPage onEnter={onEnter} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start/i }));
    });

    expect(enterNoTiltSession).toHaveBeenCalledTimes(1);
    expect(unlockIosMediaChannel).toHaveBeenCalledTimes(1);
    expect(waitForIosMediaChannel).toHaveBeenCalled();

    await flushSplashEnterTimers();

    expect(audioEngine.startContext).toHaveBeenCalled();
    expect(onEnter).toHaveBeenCalled();
  });

  it('does not show the legacy ringer warning', () => {
    render(<SplashPage onEnter={vi.fn()} />);
    expect(
      screen.queryByText(/ringer is ON/i),
    ).not.toBeInTheDocument();
  });

  it('shows only the Start button on desktop', () => {
    render(<SplashPage onEnter={vi.fn()} />);
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /tilt/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /no tilt/i }),
    ).not.toBeInTheDocument();
  });

  it('shows Tilt and No Tilt buttons on first mobile visit (no persisted settings)', () => {
    vi.mocked(useLayoutTier).mockReturnValue('phone');
    mockChordContextState.hasPersistedSettings = false;
    render(<SplashPage onEnter={vi.fn()} />);
    expect(screen.getByText('Tilt').closest('button')).toBeInTheDocument();
    expect(screen.getByText('No Tilt').closest('button')).toBeInTheDocument();
    expect(
      screen.getByText(/You can change this anytime in Settings\./i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^start$/i }),
    ).not.toBeInTheDocument();
  });

  it('enters no-tilt session from the No Tilt button on first mobile visit without permission request', async () => {
    vi.mocked(useLayoutTier).mockReturnValue('phone');
    mockChordContextState.hasPersistedSettings = false;
    const onEnter = vi.fn();
    render(<SplashPage onEnter={onEnter} />);

    const noTiltButton = screen.getByText('No Tilt').closest('button')!;
    await act(async () => {
      fireEvent.click(noTiltButton);
    });

    expect(requestTiltPermission).not.toHaveBeenCalled();
    expect(enterNoTiltSession).toHaveBeenCalledTimes(1);
    expect(enterTiltSession).not.toHaveBeenCalled();
    expect(unlockIosMediaChannel).toHaveBeenCalled();

    await flushSplashEnterTimers();
    expect(onEnter).toHaveBeenCalled();
  });

  it('requests motion permission, enters tilt mode, and presents Tilt to Strum options when Tilt is selected', async () => {
    vi.mocked(useLayoutTier).mockReturnValue('phone');
    mockChordContextState.hasPersistedSettings = false;
    const onEnter = vi.fn();
    render(<SplashPage onEnter={onEnter} />);

    const tiltButton = screen.getByText('Tilt').closest('button')!;
    await act(async () => {
      fireEvent.click(tiltButton);
    });

    expect(requestTiltPermission).toHaveBeenCalledTimes(1);
    expect(enterTiltSession).toHaveBeenCalledTimes(1);
    expect(enterNoTiltSession).not.toHaveBeenCalled();

    // The second prompt should now be visible
    expect(screen.getByRole('heading', { name: /Tilt to Strum/i })).toBeInTheDocument();
    const onButton = screen.getByText('On').closest('button')!;
    const offButton = screen.getByText('Off').closest('button')!;
    expect(onButton).toBeInTheDocument();
    expect(offButton).toBeInTheDocument();

    // Audio has not started yet
    expect(unlockIosMediaChannel).not.toHaveBeenCalled();

    // Tap "On"
    await act(async () => {
      fireEvent.click(onButton);
    });

    expect(setTiltToStrum).toHaveBeenCalledWith(true);
    expect(unlockIosMediaChannel).toHaveBeenCalledTimes(1);

    await flushSplashEnterTimers();
    expect(onEnter).toHaveBeenCalled();
  });

  it('allows choosing Off in the Tilt to Strum prompt', async () => {
    vi.mocked(useLayoutTier).mockReturnValue('tablet');
    mockChordContextState.hasPersistedSettings = false;
    const onEnter = vi.fn();
    render(<SplashPage onEnter={onEnter} />);

    const tiltButton = screen.getByText('Tilt').closest('button')!;
    await act(async () => {
      fireEvent.click(tiltButton);
    });

    const offButton = screen.getByText('Off').closest('button')!;

    // Tap "Off"
    await act(async () => {
      fireEvent.click(offButton);
    });

    expect(setTiltToStrum).toHaveBeenCalledWith(false);
    expect(unlockIosMediaChannel).toHaveBeenCalledTimes(1);

    await flushSplashEnterTimers();
    expect(onEnter).toHaveBeenCalled();
  });

  it('shows single Start button for returning mobile user (hasPersistedSettings: true)', () => {
    vi.mocked(useLayoutTier).mockReturnValue('phone');
    mockChordContextState.hasPersistedSettings = true;
    render(<SplashPage onEnter={vi.fn()} />);

    expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^tilt$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /no tilt/i }),
    ).not.toBeInTheDocument();
  });

  it('returning mobile user with tiltModeEnabled: true taps Start and requests permission + enters tilt mode', async () => {
    vi.mocked(useLayoutTier).mockReturnValue('phone');
    mockChordContextState.hasPersistedSettings = true;
    mockChordContextState.tiltModeEnabled = true;
    const onEnter = vi.fn();
    render(<SplashPage onEnter={onEnter} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
    });

    expect(requestTiltPermission).toHaveBeenCalledTimes(1);
    expect(enterTiltSession).toHaveBeenCalledTimes(1);
    expect(enterNoTiltSession).not.toHaveBeenCalled();
    expect(unlockIosMediaChannel).toHaveBeenCalledTimes(1);

    await flushSplashEnterTimers();
    expect(onEnter).toHaveBeenCalled();
  });

  it('returning mobile user with tiltModeEnabled: false taps Start and enters no-tilt mode without permission request', async () => {
    vi.mocked(useLayoutTier).mockReturnValue('phone');
    mockChordContextState.hasPersistedSettings = true;
    mockChordContextState.tiltModeEnabled = false;
    const onEnter = vi.fn();
    render(<SplashPage onEnter={onEnter} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^start$/i }));
    });

    expect(requestTiltPermission).not.toHaveBeenCalled();
    expect(enterNoTiltSession).toHaveBeenCalledTimes(1);
    expect(enterTiltSession).not.toHaveBeenCalled();
    expect(unlockIosMediaChannel).toHaveBeenCalledTimes(1);

    await flushSplashEnterTimers();
    expect(onEnter).toHaveBeenCalled();
  });
});
