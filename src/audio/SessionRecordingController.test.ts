import { describe, it, expect, vi } from 'vitest';
import {
  RECORDING_STOP_FADE_MS,
  SessionRecordingController,
} from './SessionRecordingController';

vi.mock('tone', () => ({
  now: () => 0,
  Gain: class {
    gain = {
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
  },
}));

vi.mock('./SessionRecorder', () => ({
  SessionRecorder: {
    isSupported: () => true,
    create: () => null,
  },
}));

vi.mock('./SessionMidiRecorder', () => ({
  SessionMidiRecorder: class {
    isRecording() {
      return false;
    }
    start() {}
    encode() {
      return Promise.resolve(new Blob());
    }
    logNoteOns() {}
    logNoteOffs() {}
    logAllNotesOff() {}
  },
}));

describe('SessionRecordingController fade Promise', () => {
  it('resolves fadeOutTap when clearFadeTimer runs mid-fade', async () => {
    const controller = new SessionRecordingController();
    const tap = {
      gain: {
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };
    (
      controller as unknown as {
        recordTailGain: typeof tap | null;
      }
    ).recordTailGain = tap;

    const fadePromise = controller.fadeOutTap(
      async () => undefined,
      RECORDING_STOP_FADE_MS,
    );

    // Yield so ensureEngineReady completes and scheduleTapFade arms resolve.
    await Promise.resolve();
    await Promise.resolve();

    const internal = controller as unknown as {
      fadeResolve: (() => void) | null;
      recordingFadeTimer: ReturnType<typeof setTimeout> | null;
    };
    expect(internal.fadeResolve).not.toBeNull();
    expect(internal.recordingFadeTimer).not.toBeNull();

    controller.resetTailGain();
    expect(internal.fadeResolve).toBeNull();
    expect(internal.recordingFadeTimer).toBeNull();

    await expect(fadePromise).resolves.toBeUndefined();
  });
});
