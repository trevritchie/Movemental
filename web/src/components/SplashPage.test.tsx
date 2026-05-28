/// <reference types="node" />
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SplashPage } from './SplashPage';
import {
  unlockIosMediaChannel,
  waitForIosMediaChannel,
} from '../audio/iosMediaChannel';
import { audioEngine } from '../audio/AudioEngine';

vi.mock('../audio/iosMediaChannel', () => ({
  unlockIosMediaChannel: vi.fn(),
  waitForIosMediaChannel: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    startContext: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('SplashPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
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
});
