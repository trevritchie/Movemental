/// <reference types="node" />
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RecordingReviewPanel } from './RecordingReviewPanel';

describe('RecordingReviewPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads blob URLs through a source child for iOS compatibility', () => {
    const loadSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'load')
      .mockImplementation(() => undefined);

    render(
      <RecordingReviewPanel
        objectUrl="blob:mock-recording"
        mimeType="audio/mp4"
        downloadExtension="m4a"
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
    const source = player.querySelector('source') as HTMLSourceElement;

    expect(player.getAttribute('src')).toBeNull();
    expect(source.src).toBe('blob:mock-recording');
    expect(source.type).toBe('audio/mp4');
    expect(loadSpy).toHaveBeenCalled();
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
        mimeType="audio/mp4"
        downloadExtension="m4a"
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
    const source = player.querySelector('source') as HTMLSourceElement;

    unmount();

    expect(pauseSpy).toHaveBeenCalled();
    expect(player.getAttribute('src')).toBeNull();
    expect(source.getAttribute('src')).toBeNull();
    expect(loadSpy).toHaveBeenCalled();
  });

  it('renders a MIDI download button', () => {
    const onDownloadMidi = vi.fn();

    render(
      <RecordingReviewPanel
        objectUrl="blob:mock-recording"
        mimeType="audio/mp4"
        downloadExtension="m4a"
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
