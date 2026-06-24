import React from 'react';
import { Mic, CircleStop } from 'lucide-react';
import { formatElapsed, useRecording } from '../hooks/useRecording';
import { RecordingReviewPanel } from './RecordingReviewPanel';
import { RecordingReviewPortal } from './RecordingReviewPortal';

interface RecordControlProps {
  variant: 'diagram' | 'mobile';
}

/** Record toggle plus post-stop review (playback + M4A/MIDI download). */
export const RecordControl: React.FC<RecordControlProps> = ({ variant }) => {
  const {
    status,
    isSupported,
    elapsedMs,
    objectUrl,
    mimeType,
    downloadExtension,
    midiDownloadExtension,
    isExportingAudio,
    error,
    start,
    stop,
    dismiss,
    download,
    downloadMidi,
  } = useRecording();

  const btnClass =
    variant === 'diagram'
      ? 'diagram-toolbar-btn record-control'
      : 'mobile-toolbar-btn record-control';

  if (!isSupported) {
    return null;
  }

  const isRecording = status === 'recording';
  const isReady = status === 'ready' && objectUrl !== null;

  const handleToggle = () => {
    if (isRecording) {
      void stop();
      return;
    }

    if (isReady) {
      dismiss();
    }

    void start();
  };

  const handleNewRecording = () => {
    dismiss();
    void start();
  };

  const ariaLabel = isRecording
    ? 'Stop recording and save'
    : 'Start recording';

  const reviewProps = isReady
    ? {
        objectUrl,
        mimeType,
        downloadExtension,
        midiDownloadExtension,
        isExportingAudio,
        onDismiss: dismiss,
        onDownload: download,
        onDownloadMidi: downloadMidi,
        onNewRecording: handleNewRecording,
      }
    : null;

  return (
    <div className={`record-control-root record-control-root--${variant}`}>
      <button
        type="button"
        className={`${btnClass}${isRecording ? ' record-control--active' : ''}`}
        onClick={handleToggle}
        title={isRecording ? 'Stop recording' : 'Record audio'}
        aria-label={ariaLabel}
        aria-pressed={isRecording}
      >
        {isRecording ? (
          <>
            <span className="record-control__dot" aria-hidden="true" />
            <CircleStop size={22} />
          </>
        ) : (
          <Mic size={22} />
        )}
        {isRecording && (
          <span
            className="record-control__elapsed-inset"
            aria-live="polite"
          >
            {formatElapsed(elapsedMs)}
          </span>
        )}
      </button>

      {error && (
        <p className="record-control__error" role="alert">
          {error}
        </p>
      )}

      {reviewProps && variant === 'diagram' && (
        <RecordingReviewPanel {...reviewProps} />
      )}

      {/* Portal avoids mobile panel overflow clipping the review player. */}
      {reviewProps && variant === 'mobile' && (
        <RecordingReviewPortal isOpen {...reviewProps} />
      )}
    </div>
  );
};
