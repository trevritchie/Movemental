/// <reference types="node" />
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RecordingReviewPanel } from './RecordingReviewPanel';

describe('RecordingReviewPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('releases the audio element on unmount', () => {
    const pauseSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => undefined);
    const loadSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'load')
      .mockImplementation(() => undefined);

    const { unmount } = render(
      <RecordingReviewPanel
        objectUrl="blob:mock-recording"
        mimeType="audio/webm"
        downloadExtension="webm"
        midiDownloadExtension="mid"
        onDismiss={vi.fn()}
        onDownload={vi.fn()}
        onDownloadMidi={vi.fn()}
        onNewRecording={vi.fn()}
      />,
    );

    const player = document.querySelector(
      '.record-review__player',
    ) as HTMLAudioElement;

    unmount();

    expect(pauseSpy).toHaveBeenCalled();
    expect(player.getAttribute('src')).toBeNull();
    expect(loadSpy).toHaveBeenCalled();
  });

  it('renders a MIDI download button', () => {
    const onDownloadMidi = vi.fn();

    render(
      <RecordingReviewPanel
        objectUrl="blob:mock-recording"
        mimeType="audio/webm"
        downloadExtension="webm"
        midiDownloadExtension="mid"
        onDismiss={vi.fn()}
        onDownload={vi.fn()}
        onDownloadMidi={onDownloadMidi}
        onNewRecording={vi.fn()}
      />,
    );

    const midiButton = screen.getByRole('button', { name: 'Download .mid' });
    fireEvent.click(midiButton);

    expect(onDownloadMidi).toHaveBeenCalledTimes(1);
  });
});
