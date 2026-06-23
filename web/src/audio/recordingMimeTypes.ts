/** MIME candidates in preferred order for MediaRecorder. */
export const RECORDING_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
] as const;

/**
 * Pick the first MediaRecorder MIME type supported by the current browser.
 */
export function pickRecordingMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  for (const mimeType of RECORDING_MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    } catch {
      // Some browsers throw on unsupported format strings.
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
