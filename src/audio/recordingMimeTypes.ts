import {
  isAppleRecordingPlatform,
  isChromium,
} from '../utils/devicePlatform';

/**
 * MediaRecorder MIME preference by platform.
 *
 * WebM/Opus is fine in Chrome but won't play in iOS Files or many desktop
 * players. Apple and Chromium prefer M4A/AAC when supported; Firefox keeps
 * WebM-first with MP4 fallback.
 */

/** Legacy default order (WebM-first). Kept for tests and backwards reference. */
export const RECORDING_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
] as const;

const MP4_MIME_CANDIDATES = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/aac',
] as const;

const WEBM_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
] as const;

const CHROMIUM_MIME_CANDIDATES = [
  ...MP4_MIME_CANDIDATES,
  ...WEBM_MIME_CANDIDATES,
] as const;

const FIREFOX_MIME_CANDIDATES = [
  ...WEBM_MIME_CANDIDATES,
  ...MP4_MIME_CANDIDATES,
] as const;

/** MIME types to probe for the current browser, in preferred order. */
export function getRecordingMimeCandidates(): readonly string[] {
  if (isAppleRecordingPlatform()) {
    return MP4_MIME_CANDIDATES;
  }
  if (isChromium()) {
    return CHROMIUM_MIME_CANDIDATES;
  }
  return FIREFOX_MIME_CANDIDATES;
}

function isMimeTypeSupported(mimeType: string): boolean {
  try {
    return MediaRecorder.isTypeSupported(mimeType);
  } catch {
    return false;
  }
}

/**
 * Pick the first MediaRecorder MIME type supported by the current browser.
 */
export function pickRecordingMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  for (const mimeType of getRecordingMimeCandidates()) {
    if (isMimeTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return null;
}

/**
 * File extension for a download filename from a recorded MIME type.
 */
export function extensionForMimeType(mime: string): string {
  const normalized = mime.toLowerCase();

  if (normalized.includes('webm')) {
    return 'webm';
  }
  if (normalized.includes('mp4')) {
    return 'm4a';
  }
  if (normalized.includes('aac')) {
    return 'aac';
  }
  if (normalized.includes('ogg')) {
    return 'ogg';
  }

  return 'audio';
}

/** True when the blob is already AAC in an MP4/M4A container (skip ffmpeg). */
export function isM4aCompatibleBlob(blob: Blob): boolean {
  const normalized = blob.type.toLowerCase();
  return normalized.includes('mp4') || normalized.includes('aac');
}

export {
  MP4_MIME_CANDIDATES,
  CHROMIUM_MIME_CANDIDATES,
  FIREFOX_MIME_CANDIDATES,
};
