import { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { extensionForMimeType } from '../audio/recordingMimeTypes';

export type RecordingStatus = 'idle' | 'recording' | 'ready';

const MAX_RECORDING_MS = 10 * 60 * 1000;

function formatRecordingTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function revokeObjectUrl(url: string | null): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

export interface UseRecordingResult {
  status: RecordingStatus;
  isSupported: boolean;
  elapsedMs: number;
  objectUrl: string | null;
  mimeType: string | null;
  downloadFilename: string | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  dismiss: () => void;
  download: () => void;
}

export function useRecording(): UseRecordingResult {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const blobRef = useRef<Blob | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const maxDurationTimerRef = useRef<number | null>(null);
  const stopInFlightRef = useRef(false);
  const statusRef = useRef<RecordingStatus>(status);
  statusRef.current = status;

  const isSupported = audioEngine.isRecordingSupported();

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxDurationTimerRef.current !== null) {
      window.clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const resetReview = useCallback(() => {
    revokeObjectUrl(objectUrlRef.current);
    objectUrlRef.current = null;
    blobRef.current = null;
    setObjectUrl(null);
    setMimeType(null);
    setDownloadFilename(null);
  }, []);

  const dismiss = useCallback(() => {
    resetReview();
    statusRef.current = 'idle';
    setStatus('idle');
    setElapsedMs(0);
    setError(null);
    startedAtRef.current = null;
  }, [resetReview]);

  const stop = useCallback(async () => {
    if (statusRef.current !== 'recording' || stopInFlightRef.current) {
      return;
    }

    stopInFlightRef.current = true;
    clearTimers();

    try {
      const blob = await audioEngine.stopRecording();
      const resolvedMime = blob.type || 'audio/webm';
      const url = URL.createObjectURL(blob);
      const timestamp = formatRecordingTimestamp(new Date());
      const ext = extensionForMimeType(resolvedMime);

      revokeObjectUrl(objectUrlRef.current);
      blobRef.current = blob;
      objectUrlRef.current = url;
      setObjectUrl(url);
      setMimeType(resolvedMime);
      setDownloadFilename(`movemental-${timestamp}.${ext}`);
      statusRef.current = 'ready';
      setStatus('ready');
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to stop recording';
      setError(message);
      statusRef.current = 'idle';
      setStatus('idle');
      setElapsedMs(0);
      startedAtRef.current = null;
    } finally {
      stopInFlightRef.current = false;
    }
  }, [clearTimers]);

  const start = useCallback(async () => {
    if (statusRef.current === 'recording' || !isSupported) {
      return;
    }

    resetReview();
    setError(null);
    setElapsedMs(0);

    try {
      await audioEngine.startRecording();
      startedAtRef.current = Date.now();
      statusRef.current = 'recording';
      setStatus('recording');

      timerRef.current = window.setInterval(() => {
        if (startedAtRef.current !== null) {
          setElapsedMs(Date.now() - startedAtRef.current);
        }
      }, 250);

      maxDurationTimerRef.current = window.setTimeout(() => {
        void stop();
      }, MAX_RECORDING_MS);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      statusRef.current = 'idle';
      setStatus('idle');
      clearTimers();
    }
  }, [clearTimers, isSupported, resetReview, stop]);

  const download = useCallback(() => {
    if (!objectUrlRef.current || !downloadFilename) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = objectUrlRef.current;
    anchor.download = downloadFilename;
    anchor.click();
  }, [downloadFilename]);

  useEffect(() => {
    return () => {
      clearTimers();
      revokeObjectUrl(objectUrlRef.current);
    };
  }, [clearTimers]);

  return {
    status,
    isSupported,
    elapsedMs,
    objectUrl,
    mimeType,
    downloadFilename,
    error,
    start,
    stop,
    dismiss,
    download,
  };
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export { formatElapsed };
