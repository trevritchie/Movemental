import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  extensionForMimeType,
  pickRecordingMimeType,
  RECORDING_MIME_CANDIDATES,
} from './recordingMimeTypes';

function mockMediaRecorder(
  isSupported: (type: string) => boolean,
): typeof MediaRecorder {
  return class {
    static isTypeSupported(type: string): boolean {
      return isSupported(type);
    }
  } as unknown as typeof MediaRecorder;
}

describe('pickRecordingMimeType', () => {
  const originalMediaRecorder = globalThis.MediaRecorder;

  beforeEach(() => {
    globalThis.MediaRecorder = mockMediaRecorder(
      (type) => type === 'audio/webm;codecs=opus' || type === 'audio/mp4',
    );
  });

  afterEach(() => {
    globalThis.MediaRecorder = originalMediaRecorder;
  });

  it('returns the first supported candidate in order', () => {
    expect(pickRecordingMimeType()).toBe('audio/webm;codecs=opus');
  });

  it('falls through to later candidates when early ones fail', () => {
    globalThis.MediaRecorder = mockMediaRecorder(
      (type) => type === 'audio/mp4',
    );

    expect(pickRecordingMimeType()).toBe('audio/mp4');
  });

  it('returns null when nothing is supported', () => {
    globalThis.MediaRecorder = mockMediaRecorder(() => false);

    expect(pickRecordingMimeType()).toBeNull();
  });

  it('returns null when MediaRecorder is unavailable', () => {
    // @ts-expect-error test override
    globalThis.MediaRecorder = undefined;
    expect(pickRecordingMimeType()).toBeNull();
  });

  it('probes candidates in the documented order', () => {
    const probed: string[] = [];
    globalThis.MediaRecorder = mockMediaRecorder((type) => {
      probed.push(type);
      return false;
    });

    pickRecordingMimeType();
    expect(probed).toEqual([...RECORDING_MIME_CANDIDATES]);
  });
});

describe('extensionForMimeType', () => {
  it('maps webm and mp4 mime types to file extensions', () => {
    expect(extensionForMimeType('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionForMimeType('audio/mp4')).toBe('m4a');
    expect(extensionForMimeType('audio/aac')).toBe('aac');
  });
});
