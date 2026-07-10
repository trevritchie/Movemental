import { describe, expect, it } from 'vitest';
import {
  SUSTAIN_PEAK_PASS_DB,
  analyzeAudioBuffer,
} from './audioBufferAnalysis';

function createTestBuffer(
  samples: number[],
  sampleRate = 44100,
): AudioBuffer {
  const channel = Float32Array.from(samples);
  return {
    duration: samples.length / sampleRate,
    length: samples.length,
    sampleRate,
    numberOfChannels: 1,
    getChannelData: () => channel,
  } as unknown as AudioBuffer;
}

describe('audioBufferAnalysis', () => {
  it('measures peak and RMS on a sine-like buffer', () => {
    const samples = Array.from({ length: 4410 }, (_, index) =>
      Math.sin((index / 4410) * Math.PI * 2) * 0.25,
    );
    const buffer = createTestBuffer(samples);
    const result = analyzeAudioBuffer(buffer, {
      sustainWindow: { startSec: 0, endSec: 0.1 },
    });

    expect(result.peakDb).toBeCloseTo(-12.04, 0.5);
    expect(result.rmsDb).toBeLessThan(0);
    expect(result.clippedSampleCount).toBe(0);
  });

  it('counts clipped samples at 0 dBFS', () => {
    const buffer = createTestBuffer([0, 0.5, 1, -1, 0.25]);
    const result = analyzeAudioBuffer(buffer, {
      sustainWindow: { startSec: 0, endSec: 0.001 },
    });

    expect(result.clippedSampleCount).toBe(2);
    expect(result.peakDb).toBe(0);
  });

  it('measures sustain window separately from full buffer', () => {
    const samples = [
      ...Array(1000).fill(0),
      ...Array(1000).fill(0.5),
      ...Array(1000).fill(0),
    ];
    const buffer = createTestBuffer(samples);
    const result = analyzeAudioBuffer(buffer, {
      sustainWindow: {
        startSec: 1000 / 44100,
        endSec: 2000 / 44100,
      },
    });

    expect(result.sustainPeakDb).toBeCloseTo(-6.02, 0.5);
    expect(result.peakDb).toBeCloseTo(-6.02, 0.5);
  });

  it('documents the sustain peak pass threshold', () => {
    expect(SUSTAIN_PEAK_PASS_DB).toBe(-2.7);
  });
});
