import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRecording } from './useRecording';
import { audioEngine, RECORDING_STOP_FADE_MS } from '../audio/AudioEngine';

vi.mock('../audio/AudioEngine', () => ({
  RECORDING_STOP_FADE_MS: 300,
  audioEngine: {
    isRecordingSupported: vi.fn(() => true),
    startRecording: vi.fn(async () => undefined),
    stopRecording: vi.fn(async () => ({
      audio: new Blob(['test'], { type: 'audio/webm' }),
      midi: new Blob(['midi'], { type: 'audio/midi' }),
    })),
    fadeOutRecordingTap: vi.fn(async () => undefined),
    resetRecordingTailGain: vi.fn(),
    releaseActiveNotes: vi.fn(),
  },
}));

describe('useRecording', () => {
  const createObjectURL = vi.fn(() => 'blob:mock-url');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('transitions idle -> recording -> ready on stop with recorder fade', async () => {
    const { result } = renderHook(() => useRecording());

    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe('recording');
    expect(audioEngine.startRecording).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.stop();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(audioEngine.fadeOutRecordingTap).toHaveBeenCalledWith(
      RECORDING_STOP_FADE_MS,
    );
    expect(audioEngine.stopRecording).toHaveBeenCalledTimes(1);
    expect(audioEngine.resetRecordingTailGain).toHaveBeenCalledTimes(1);
    expect(audioEngine.releaseActiveNotes).toHaveBeenCalledTimes(1);

    const panicOrder =
      vi.mocked(audioEngine.releaseActiveNotes).mock.invocationCallOrder[0];
    const fadeOrder =
      vi.mocked(audioEngine.fadeOutRecordingTap).mock.invocationCallOrder[0];
    const stopOrder =
      vi.mocked(audioEngine.stopRecording).mock.invocationCallOrder[0];
    expect(panicOrder).toBeLessThan(fadeOrder);
    expect(fadeOrder).toBeLessThan(stopOrder);

    expect(result.current.objectUrl).toBe('blob:mock-url');
    expect(result.current.downloadFilename).toMatch(/^movemental-.*\.webm$/);
    expect(result.current.midiDownloadFilename).toMatch(/^movemental-.*\.mid$/);
  });

  it('revokes blob URL on dismiss', async () => {
    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.start();
      await result.current.stop();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.status).toBe('idle');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(result.current.midiDownloadFilename).toBeNull();
  });

  it('revokes previous blob URL when starting a new recording', async () => {
    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.start();
      await result.current.stop();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    createObjectURL.mockReturnValueOnce('blob:second-url');

    await act(async () => {
      await result.current.start();
    });

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(result.current.status).toBe('recording');
  });

  it('does not stop recording when panic release is unrelated', async () => {
    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      audioEngine.releaseActiveNotes();
    });

    expect(result.current.status).toBe('recording');
    expect(audioEngine.stopRecording).not.toHaveBeenCalled();
    expect(audioEngine.fadeOutRecordingTap).not.toHaveBeenCalled();
  });

  it('downloadMidi saves a .mid file from the stored blob', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.start();
      await result.current.stop();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      result.current.downloadMidi();
    });

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(clickSpy).toHaveBeenCalled();
    expect(result.current.midiDownloadFilename).toMatch(/^movemental-.*\.mid$/);
  });

  it('resets recorder tail gain when stop fails', async () => {
    vi.mocked(audioEngine.stopRecording).mockRejectedValueOnce(
      new Error('stop failed'),
    );

    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await result.current.stop();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });

    expect(audioEngine.fadeOutRecordingTap).toHaveBeenCalledTimes(1);
    expect(audioEngine.releaseActiveNotes).toHaveBeenCalledTimes(1);
    expect(audioEngine.resetRecordingTailGain).toHaveBeenCalledTimes(1);
  });
});
