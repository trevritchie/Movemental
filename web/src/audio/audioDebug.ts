/**
 * Opt-in AudioEngine console tracing for local gain-staging work.
 *
 * Enable in a DEV session:
 *   localStorage.setItem('movemental:audioDebug', '1')
 * then reload. Disable with removeItem or set to '0'.
 */

export const AUDIO_ENGINE_DEBUG_KEY = 'movemental:audioDebug';

export function isAudioEngineDebugEnabled(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }
  try {
    return localStorage.getItem(AUDIO_ENGINE_DEBUG_KEY) === '1';
  } catch {
    return false;
  }
}

export function audioDebugLog(...args: unknown[]): void {
  if (isAudioEngineDebugEnabled()) {
    console.log(...args);
  }
}
