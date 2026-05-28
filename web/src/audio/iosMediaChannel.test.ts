/// <reference types="node" />
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('iosMediaChannel', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';

    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 2,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'audioSession', {
      value: { type: 'auto' },
      configurable: true,
      writable: true,
    });
  });

  it('sets audioSession to playback on unlock', async () => {
    const { unlockIosMediaChannel, waitForIosMediaChannel } = await import(
      './iosMediaChannel'
    );

    unlockIosMediaChannel();
    await waitForIosMediaChannel();

    expect(
      (navigator as Navigator & { audioSession: { type: string } })
        .audioSession.type,
    ).toBe('playback');
  });

  it('marks non-iOS environments unlocked without audioSession changes', async () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      configurable: true,
      writable: true,
    });

    const session = (navigator as Navigator & {
      audioSession: { type: string };
    }).audioSession;
    session.type = 'auto';

    const { unlockIosMediaChannel, waitForIosMediaChannel } = await import(
      './iosMediaChannel'
    );

    unlockIosMediaChannel();
    await waitForIosMediaChannel();

    expect(session.type).toBe('auto');
  });
});
