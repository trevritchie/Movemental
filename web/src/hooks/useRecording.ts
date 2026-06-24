import { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine, RECORDING_STOP_FADE_MS } from '../audio/AudioEngine';
import { exportM4a } from '../audio/SessionAudioExporter';

export type RecordingStatus = 'idle' | 'recording' | 'ready';

/** Hard cap aligned with typical MediaRecorder memory use in long sessions. */
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
  downloadExtension: string | null;
  midiDownloadFilename: string | null;
  midiDownloadExtension: string | null;
  isExportingAudio: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  dismiss: () => void;
  download: () => void;
  downloadMidi: () => void;
}

/**
 * Session recording state: idle, actively capturing, or review-ready.
 *
 * Stop order matters: release live synth voices, fade the recorder tap, then
 * finalize audio + MIDI blobs so playback is not masked by ongoing audio.
 */
export function useRecording(): UseRecordingResult {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string | null>(
    null,
  );
  const [downloadExtension, setDownloadExtension] = useState<string | null>(
    null,
  );
  const [midiDownloadFilename, setMidiDownloadFilename] = useState<
    string | null
  >(null);
  const [midiDownloadExtension, setMidiDownloadExtension] = useState<
    string | null
  >(null);
  const [isExportingAudio, setIsExportingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blobRef = useRef<Blob | null>(null);
  /** Cached M4A after first export; avoids re-running ffmpeg on repeat downloads. */
  const m4aBlobRef = useRef<Blob | null>(null);
  /** MIDI blob kept in memory only; no preview object URL until download. */
  const midiBlobRef = useRef<Blob | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const maxDurationTimerRef = useRef<number | null>(null);
  const stopInFlightRef = useRef(false);
  const exportInFlightRef = useRef(false);
  const statusRef = useRef<RecordingStatus>(status);

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
    m4aBlobRef.current = null;
    midiBlobRef.current = null;
    setObjectUrl(null);
    setMimeType(null);
    setDownloadFilename(null);
    setDownloadExtension(null);
    setMidiDownloadFilename(null);
    setMidiDownloadExtension(null);
    setIsExportingAudio(false);
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
      // Implicit panic: silence live voices before review playback.
      audioEngine.releaseActiveNotes();
      await audioEngine.fadeOutRecordingTap(RECORDING_STOP_FADE_MS);
      const { audio, midi } = await audioEngine.stopRecording();
      audioEngine.resetRecordingTailGain();
      const resolvedMime = audio.type || 'audio/webm';
      const url = URL.createObjectURL(audio);
      const timestamp = formatRecordingTimestamp(new Date());

      revokeObjectUrl(objectUrlRef.current);
      blobRef.current = audio;
      m4aBlobRef.current = null;
      midiBlobRef.current = midi;
      objectUrlRef.current = url;
      setObjectUrl(url);
      setMimeType(resolvedMime);
      // Review plays the native recording MIME; download always offers .m4a.
      setDownloadFilename(`movemental-${timestamp}.m4a`);
      setDownloadExtension('m4a');
      setMidiDownloadFilename(`movemental-${timestamp}.mid`);
      setMidiDownloadExtension('mid');
      statusRef.current = 'ready';
      setStatus('ready');
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to stop recording';
      audioEngine.resetRecordingTailGain();
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
    if (!blobRef.current || !downloadFilename || exportInFlightRef.current) {
      return;
    }

    exportInFlightRef.current = true;
    setIsExportingAudio(true);

    void (async () => {
      try {
        if (!m4aBlobRef.current) {
          // Passthrough on Safari/iOS M4A; lazy ffmpeg for WebM sources.
          m4aBlobRef.current = await exportM4a(blobRef.current!);
        }

        const url = URL.createObjectURL(m4aBlobRef.current);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = downloadFilename;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to export recording';
        setError(message);
      } finally {
        exportInFlightRef.current = false;
        setIsExportingAudio(false);
      }
    })();
  }, [downloadFilename]);

  const downloadMidi = useCallback(() => {
    if (!midiBlobRef.current || !midiDownloadFilename) {
      return;
    }

    // Ephemeral URL: MIDI has no in-app preview, only file download.
    const url = URL.createObjectURL(midiBlobRef.current);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = midiDownloadFilename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [midiDownloadFilename]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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
    downloadExtension,
    midiDownloadFilename,
    midiDownloadExtension,
    isExportingAudio,
    error,
    start,
    stop,
    dismiss,
    download,
    downloadMidi,
  };
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export { formatElapsed };
