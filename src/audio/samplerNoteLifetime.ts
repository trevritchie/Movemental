/**
 * Sampler one-shot lifetime helpers for Tone.Sampler.
 *
 * Tone stores decoded buffers on a private `_buffers` map and picks the
 * nearest sample with the same interval search as Sampler._findClosest.
 * Duration matches Tone's `buffer.duration / playbackRate` attack length.
 */

export type SamplerBufferStore = {
  has: (midi: number) => boolean;
  get: (midi: number) => { duration: number; loaded: boolean };
};

/** Max semitone search distance (Tone.Sampler._findClosest). */
const MAX_SAMPLE_INTERVAL = 96;

/**
 * Tone.Sampler buffer store (private). Used only to read decoded durations
 * with the same nearest-sample formula Sampler uses internally.
 */
export function getSamplerBuffers(voice: unknown): SamplerBufferStore | null {
  if (!voice || typeof voice !== 'object') {
    return null;
  }
  const buffers = (voice as { _buffers?: SamplerBufferStore })._buffers;
  return buffers ?? null;
}

/**
 * Interval distance to the nearest loaded sample MIDI (Tone.Sampler._findClosest).
 * Positive means the sample is below the requested pitch.
 */
export function findClosestSampleInterval(
  buffers: Pick<SamplerBufferStore, 'has'>,
  midi: number,
): number | null {
  for (let interval = 0; interval < MAX_SAMPLE_INTERVAL; interval += 1) {
    if (buffers.has(midi + interval)) {
      // Avoid -0 when interval is 0 (Object.is(-0, 0) is false).
      return interval === 0 ? 0 : -interval;
    }
    if (buffers.has(midi - interval)) {
      return interval;
    }
  }
  return null;
}

/**
 * Effective one-shot length for a sampler note, matching Tone's
 * `buffer.duration / playbackRate` calculation. Null when buffers are
 * unavailable or the nearest sample is not loaded.
 *
 * @param midiFloat - MIDI note number (may be fractional for cents)
 */
export function getSamplerNoteDurationSec(
  buffers: SamplerBufferStore,
  midiFloat: number,
): number | null {
  const midi = Math.round(midiFloat);
  const remainder = midiFloat - midi;
  const difference = findClosestSampleInterval(buffers, midi);
  if (difference === null) {
    return null;
  }

  const closestNote = midi - difference;
  const buffer = buffers.get(closestNote);
  if (!buffer?.loaded || !(buffer.duration > 0)) {
    return null;
  }

  const playbackRate = Math.pow(2, (difference + remainder) / 12);
  if (!(playbackRate > 0)) {
    return null;
  }

  return buffer.duration / playbackRate;
}
