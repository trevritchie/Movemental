import React, { useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';

interface RecordingReviewPanelProps {
  objectUrl: string;
  mimeType: string | null;
  downloadExtension: string | null;
  onDismiss: () => void;
  onDownload: () => void;
  onNewRecording: () => void;
  className?: string;
}

/** Release the review player element before the blob URL is revoked. */
function releaseReviewPlayer(audio: HTMLAudioElement | null): void {
  if (!audio) {
    return;
  }

  audio.pause();
  audio.removeAttribute('src');
  audio.load();
}

/** Playback and download UI shown after a recording is saved. */
export const RecordingReviewPanel: React.FC<RecordingReviewPanelProps> = ({
  objectUrl,
  mimeType,
  downloadExtension,
  onDismiss,
  onDownload,
  onNewRecording,
  className = 'record-review',
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      releaseReviewPlayer(audio);
    };
  }, [objectUrl]);

  const downloadLabel = downloadExtension
    ? `Download .${downloadExtension}`
    : 'Download';

  return (
    <div className={className} role="region" aria-label="Recording review">
      <div className="record-review__header">
        <span className="record-review__title">Recording ready</span>
        <button
          type="button"
          className="record-review__close"
          onClick={onDismiss}
          aria-label="Dismiss recording review"
        >
          <X size={16} />
        </button>
      </div>
      <audio
        ref={audioRef}
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
          onClick={onDownload}
        >
          <Download size={16} />
          {downloadLabel}
        </button>
        <button
          type="button"
          className="record-review__new"
          onClick={onNewRecording}
        >
          New recording
        </button>
      </div>
    </div>
  );
};
