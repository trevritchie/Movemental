import { describe, it, expect } from 'vitest';
import {
  findClosestSampleInterval,
  getSamplerBuffers,
  getSamplerNoteDurationSec,
  type SamplerBufferStore,
} from './samplerNoteLifetime';

function makeBuffers(
  samples: Record<number, { duration: number; loaded: boolean }>,
): SamplerBufferStore {
  return {
    has: (midi) => Object.prototype.hasOwnProperty.call(samples, midi),
    get: (midi) => samples[midi]!,
  };
}

describe('samplerNoteLifetime', () => {
  it('reads Tone Sampler private _buffers when present', () => {
    const buffers = makeBuffers({ 60: { duration: 1, loaded: true } });
    expect(getSamplerBuffers({ _buffers: buffers })).toBe(buffers);
    expect(getSamplerBuffers({})).toBeNull();
    expect(getSamplerBuffers(null)).toBeNull();
  });

  it('finds the nearest loaded sample interval', () => {
    const buffers = makeBuffers({
      60: { duration: 1, loaded: true },
      67: { duration: 1, loaded: true },
    });

    expect(findClosestSampleInterval(buffers, 60)).toBe(0);
    expect(findClosestSampleInterval(buffers, 62)).toBe(2);
    expect(findClosestSampleInterval(buffers, 65)).toBe(-2);
    expect(findClosestSampleInterval(makeBuffers({}), 60)).toBeNull();
  });

  it('computes one-shot duration as buffer.duration / playbackRate', () => {
    const buffers = makeBuffers({
      60: { duration: 2, loaded: true },
    });

    // Exact sample: playbackRate 1
    expect(getSamplerNoteDurationSec(buffers, 60)).toBeCloseTo(2);

    // Two semitones above sample: rate = 2^(2/12)
    const rate = Math.pow(2, 2 / 12);
    expect(getSamplerNoteDurationSec(buffers, 62)).toBeCloseTo(2 / rate);
  });

  it('returns null when the nearest buffer is unloaded or empty', () => {
    expect(
      getSamplerNoteDurationSec(
        makeBuffers({ 60: { duration: 1, loaded: false } }),
        60,
      ),
    ).toBeNull();
    expect(
      getSamplerNoteDurationSec(
        makeBuffers({ 60: { duration: 0, loaded: true } }),
        60,
      ),
    ).toBeNull();
  });
});
