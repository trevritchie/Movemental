/**
 * Resolve vendored sample pack URLs from public/samples/.
 *
 * Uses absolute URLs at runtime so Tone.Sampler always fetches the correct
 * MP3 bytes (relative ./ paths can mis-resolve depending on app route depth).
 */
export function samplePackBaseUrl(packId: string): string {
  return resolveSampleBaseUrl(`${import.meta.env.BASE_URL}samples/${packId}/`);
}

export function resolveSampleBaseUrl(relativeOrAbsolute: string): string {
  if (
    relativeOrAbsolute.startsWith('http://') ||
    relativeOrAbsolute.startsWith('https://')
  ) {
    return relativeOrAbsolute;
  }
  if (typeof window === 'undefined') {
    return relativeOrAbsolute;
  }
  return new URL(relativeOrAbsolute, window.location.href).href;
}
