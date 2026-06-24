import React from 'react';
import { createPortal } from 'react-dom';
import { RecordingReviewPanel } from './RecordingReviewPanel';

interface RecordingReviewPortalProps {
  isOpen: boolean;
  objectUrl: string;
  mimeType: string | null;
  downloadExtension: string | null;
  onDismiss: () => void;
  onDownload: () => void;
  onNewRecording: () => void;
}

/** Portaled review panel so mobile playback UI is not clipped by panel overflow. */
export const RecordingReviewPortal: React.FC<RecordingReviewPortalProps> = ({
  isOpen,
  objectUrl,
  mimeType,
  downloadExtension,
  onDismiss,
  onDownload,
  onNewRecording,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onDismiss();
  };

  return createPortal(
    <div
      className="record-review-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <RecordingReviewPanel
        objectUrl={objectUrl}
        mimeType={mimeType}
        downloadExtension={downloadExtension}
        onDismiss={onDismiss}
        onDownload={onDownload}
        onNewRecording={onNewRecording}
        className="record-review record-review--portal"
      />
    </div>,
    document.body,
  );
};
