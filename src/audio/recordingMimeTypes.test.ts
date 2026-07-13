import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CHROMIUM_MIME_CANDIDATES,
  extensionForMimeType,
  FIREFOX_MIME_CANDIDATES,
  getRecordingMimeCandidates,
  isM4aCompatibleBlob,
  MP4_MIME_CANDIDATES,
  pickRecordingMimeType,
} from './recordingMimeTypes';

vi.mock('../utils/devicePlatform', () => ({
  isAppleRecordingPlatform: vi.fn(() => false),
  isChromium: vi.fn(() => false),
}));

import {
  isAppleRecordingPlatform,
  isChromium,
} from '../utils/devicePlatform';

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
    vi.mocked(isAppleRecordingPlatform).mockReturnValue(false);
    vi.mocked(isChromium).mockReturnValue(false);
    globalThis.MediaRecorder = mockMediaRecorder(
      (type) => type === 'audio/webm;codecs=opus' || type === 'audio/mp4',
    );
  });

  afterEach(() => {
    globalThis.MediaRecorder = originalMediaRecorder;
  });

  it('returns the first supported Firefox-order candidate by default', () => {
    expect(pickRecordingMimeType()).toBe('audio/webm;codecs=opus');
  });

  it('prefers MP4 on Apple platforms', () => {
    vi.mocked(isAppleRecordingPlatform).mockReturnValue(true);

    expect(pickRecordingMimeType()).toBe('audio/mp4');
    expect(getRecordingMimeCandidates()).toEqual([...MP4_MIME_CANDIDATES]);
  });

  it('prefers MP4 before WebM on Chromium when both are supported', () => {
    vi.mocked(isChromium).mockReturnValue(true);

    expect(pickRecordingMimeType()).toBe('audio/mp4');
    expect(getRecordingMimeCandidates()).toEqual([...CHROMIUM_MIME_CANDIDATES]);
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

  it('probes Firefox-order candidates on default platforms', () => {
    const probed: string[] = [];
    globalThis.MediaRecorder = mockMediaRecorder((type) => {
      probed.push(type);
      return false;
    });

    pickRecordingMimeType();
    expect(probed).toEqual([...FIREFOX_MIME_CANDIDATES]);
  });
});

describe('extensionForMimeType', () => {
  it('maps webm and mp4 mime types to file extensions', () => {
    expect(extensionForMimeType('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionForMimeType('audio/mp4')).toBe('m4a');
    expect(extensionForMimeType('audio/aac')).toBe('aac');
  });
});

describe('isM4aCompatibleBlob', () => {
  it('detects mp4 and aac blobs', () => {
    expect(isM4aCompatibleBlob(new Blob([], { type: 'audio/mp4' }))).toBe(
      true,
    );
    expect(isM4aCompatibleBlob(new Blob([], { type: 'audio/aac' }))).toBe(
      true,
    );
    expect(isM4aCompatibleBlob(new Blob([], { type: 'audio/webm' }))).toBe(
      false,
    );
  });
});
