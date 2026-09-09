import React, { useEffect, useRef } from 'react';
import { Download, Share, X } from 'lucide-react';
import { isNativeApp } from '../utils/nativePlatform';

interface RecordingReviewPanelProps {
  objectUrl: string;
  mimeType: string | null;
  downloadExtension: string | null;
  midiDownloadExtension: string | null;
  isExportingAudio?: boolean;
  onDismiss: () => void;
  onDownload: () => void;
  onDownloadMidi: () => void;
  onNewRecording: () => void;
  className?: string;
}

/** Release the review player element before the blob URL is revoked. */
function releaseReviewPlayer(
  audio: HTMLAudioElement | null,
  source: HTMLSourceElement | null,
): void {
  if (!audio) {
    return;
  }

  audio.pause();
  audio.removeAttribute('src');
  if (source) {
    source.removeAttribute('src');
    source.removeAttribute('type');
  }
  audio.load();
}

function exportActionVerb(nativeShare: boolean): 'Share' | 'Download' {
  return nativeShare ? 'Share' : 'Download';
}

function audioExportLabel(
  nativeShare: boolean,
  isExporting: boolean,
  extension: string | null,
): string {
  if (isExporting) {
    return nativeShare ? 'Preparing share...' : 'Preparing download...';
  }
  const verb = exportActionVerb(nativeShare);
  return extension ? `${verb} .${extension}` : verb;
}

function midiExportLabel(
  nativeShare: boolean,
  extension: string | null,
): string {
  const verb = exportActionVerb(nativeShare);
  return extension ? `${verb} .${extension}` : `${verb} MIDI`;
}

/** Playback and download UI shown after a recording is saved. */
export const RecordingReviewPanel: React.FC<RecordingReviewPanelProps> = ({
  objectUrl,
  mimeType,
  downloadExtension,
  midiDownloadExtension,
  isExportingAudio = false,
  onDismiss,
  onDownload,
  onDownloadMidi,
  onNewRecording,
  className = 'record-review',
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceRef = useRef<HTMLSourceElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    const source = sourceRef.current;
    if (!audio || !source) {
      return;
    }

    // iOS WebKit: blob URL on <source>, not <audio src>, then load().
    source.src = objectUrl;
    if (mimeType) {
      source.type = mimeType;
    } else {
      source.removeAttribute('type');
    }
    audio.load();
  }, [objectUrl, mimeType]);

  useEffect(() => {
    const audio = audioRef.current;
    const source = sourceRef.current;
    return () => {
      releaseReviewPlayer(audio, source);
    };
  }, [objectUrl]);

  const nativeShare = isNativeApp();
  const ActionIcon = nativeShare ? Share : Download;
  const downloadLabel = audioExportLabel(
    nativeShare,
    isExportingAudio,
    downloadExtension,
  );
  const midiDownloadLabel = midiExportLabel(
    nativeShare,
    midiDownloadExtension,
  );

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
        playsInline
        preload="auto"
      >
        <source ref={sourceRef} />
      </audio>
      <div className="record-review__actions">
        <button
          type="button"
          className="record-review__download"
          onClick={onDownload}
          disabled={isExportingAudio}
        >
          <ActionIcon size={16} />
          {downloadLabel}
        </button>
        <button
          type="button"
          className="record-review__download"
          onClick={onDownloadMidi}
        >
          <ActionIcon size={16} />
          {midiDownloadLabel}
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
