import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRecording } from './useRecording';
import { audioEngine } from '../audio/AudioEngine';

vi.mock('../audio/AudioEngine', () => ({
  audioEngine: {
    isRecordingSupported: vi.fn(() => true),
    startRecording: vi.fn(async () => undefined),
    stopRecording: vi.fn(async () => new Blob(['test'], { type: 'audio/webm' })),
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

  it('transitions idle -> recording -> ready on immediate stop', async () => {
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

    expect(audioEngine.stopRecording).toHaveBeenCalledTimes(1);
    expect(result.current.objectUrl).toBe('blob:mock-url');
    expect(result.current.downloadFilename).toMatch(/^movemental-.*\.webm$/);
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
  });
});
