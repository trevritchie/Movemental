/// <reference types="node" />
import { render } from '@testing-library/react';
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
        onDismiss={vi.fn()}
        onDownload={vi.fn()}
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
});
