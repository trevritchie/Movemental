/// <reference types="node" />
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SplashPage } from './SplashPage';
import {
  unlockIosMediaChannel,
  waitForIosMediaChannel,
} from '../audio/iosMediaChannel';
import { audioEngine } from '../audio/AudioEngine';
import { useLayoutTier } from '../hooks/useLayoutTier';
import { primeHaptics } from '../audio/haptics';

vi.mock('../audio/iosMediaChannel', () => ({
  unlockIosMediaChannel: vi.fn(),
  waitForIosMediaChannel: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    startContext: vi.fn().mockResolvedValue(undefined),
  },
}));

const setPlayStyle = vi.fn();
const requestTiltPermission = vi.fn().mockResolvedValue(undefined);

vi.mock('../context/ChordContext', () => ({
  useChordContext: () => ({ setPlayStyle, requestTiltPermission }),
}));

vi.mock('../hooks/useLayoutTier', () => ({
  useLayoutTier: vi.fn(() => 'desktop'),
}));

vi.mock('../audio/haptics', () => ({
  primeHaptics: vi.fn(),
}));

describe('SplashPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(useLayoutTier).mockReturnValue('desktop');
  });

  it('unlocks iOS media channel and starts audio on Start click', async () => {
    const onEnter = vi.fn();
    render(<SplashPage onEnter={onEnter} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start/i }));
    });

    expect(unlockIosMediaChannel).toHaveBeenCalledTimes(1);
    expect(waitForIosMediaChannel).toHaveBeenCalled();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

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
      screen.queryByRole('button', { name: /static/i }),
    ).not.toBeInTheDocument();
  });

  it('shows Tilt and Static buttons on mobile', () => {
    vi.mocked(useLayoutTier).mockReturnValue('phone');
    render(<SplashPage onEnter={vi.fn()} />);
    expect(screen.getByRole('button', { name: /tilt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /static/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^start$/i }),
    ).not.toBeInTheDocument();
  });

  it('requests motion permission and enters tilt mode from the Tilt button', async () => {
    vi.mocked(useLayoutTier).mockReturnValue('phone');
    const onEnter = vi.fn();
    render(<SplashPage onEnter={onEnter} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /tilt/i }));
    });

    expect(requestTiltPermission).toHaveBeenCalledTimes(1);
    expect(setPlayStyle).toHaveBeenCalledWith('tilt');
    expect(primeHaptics).toHaveBeenCalledTimes(1);
    expect(unlockIosMediaChannel).toHaveBeenCalled();

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(onEnter).toHaveBeenCalled();
  });

  it('enters drone mode from the Static button without a permission request', async () => {
    vi.mocked(useLayoutTier).mockReturnValue('tablet');
    const onEnter = vi.fn();
    render(<SplashPage onEnter={onEnter} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /static/i }));
    });

    expect(requestTiltPermission).not.toHaveBeenCalled();
    expect(setPlayStyle).toHaveBeenCalledWith('drone');

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(onEnter).toHaveBeenCalled();
  });
});
