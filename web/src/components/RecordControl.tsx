import React, { useEffect, useRef, useState } from 'react';
import { Mic, CircleStop, Download, X } from 'lucide-react';
import { formatElapsed, useRecording } from '../hooks/useRecording';

interface RecordControlProps {
  variant: 'diagram' | 'mobile';
}

export const RecordControl: React.FC<RecordControlProps> = ({ variant }) => {
  const {
    status,
    isSupported,
    elapsedMs,
    objectUrl,
    mimeType,
    error,
    start,
    stop,
    dismiss,
    download,
  } = useRecording();

  const [showHint, setShowHint] = useState(false);
  const hintTimerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const btnClass =
    variant === 'diagram'
      ? 'diagram-toolbar-btn record-control'
      : 'mobile-toolbar-btn record-control';

  useEffect(() => {
    return () => {
      if (hintTimerRef.current !== null) {
        window.clearTimeout(hintTimerRef.current);
      }
    };
  }, []);

  if (!isSupported) {
    return null;
  }

  const isRecording = status === 'recording';
  const isReady = status === 'ready';

  const handleToggle = () => {
    if (isRecording) {
      if (hintTimerRef.current !== null) {
        window.clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }
      setShowHint(false);
      void stop();
      return;
    }

    if (isReady) {
      dismiss();
    }

    void start().then(() => {
      setShowHint(true);
      hintTimerRef.current = window.setTimeout(() => {
        setShowHint(false);
        hintTimerRef.current = null;
      }, 5000);
    });
  };

  const ariaLabel = isRecording
    ? 'Stop recording and save'
    : 'Start recording';

  return (
    <div
      ref={rootRef}
      className={`record-control-root record-control-root--${variant}`}
    >
      <button
        type="button"
        className={`${btnClass}${isRecording ? ' record-control--active' : ''}`}
        onClick={handleToggle}
        title={isRecording ? 'Stop recording' : 'Record session'}
        aria-label={ariaLabel}
        aria-pressed={isRecording}
      >
        {isRecording ? (
          <>
            <span className="record-control__dot" aria-hidden="true" />
            <CircleStop size={18} />
          </>
        ) : (
          <Mic size={18} />
        )}
        {variant === 'mobile' && isRecording && (
          <span className="record-control__rec-label" aria-hidden="true">
            REC
          </span>
        )}
      </button>

      {isRecording && (
        <span className="record-control__timer" aria-live="polite">
          {formatElapsed(elapsedMs)}
        </span>
      )}

      {showHint && isRecording && (
        <p className="record-control__hint" role="status">
          Use Panic to silence notes; tap here when finished to save.
        </p>
      )}

      {error && (
        <p className="record-control__error" role="alert">
          {error}
        </p>
      )}

      {isReady && objectUrl && (
        <div
          className="record-review"
          role="region"
          aria-label="Recording review"
        >
          <div className="record-review__header">
            <span className="record-review__title">Recording ready</span>
            <button
              type="button"
              className="record-review__close"
              onClick={dismiss}
              aria-label="Dismiss recording review"
            >
              <X size={16} />
            </button>
          </div>
          <audio
            className="record-review__player"
            controls
            src={objectUrl}
            preload="metadata"
          >
            {mimeType && <source src={objectUrl} type={mimeType} />}
          </audio>
          <div className="record-review__actions">
            <button
              type="button"
              className="record-review__download"
              onClick={download}
            >
              <Download size={16} />
              Download
            </button>
            <button
              type="button"
              className="record-review__new"
              onClick={() => {
                dismiss();
                void start();
              }}
            >
              New recording
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
