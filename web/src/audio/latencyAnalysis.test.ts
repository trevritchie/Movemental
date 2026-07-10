import { describe, expect, it } from 'vitest';
import {
  countGlitchOnsets,
  median,
  percentile,
  summarizeLatencySamples,
} from './latencyAnalysis';

describe('latencyAnalysis', () => {
  it('computes median and p95', () => {
    const samples = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
    expect(median(samples)).toBe(19);
    expect(percentile(samples, 95)).toBe(28);
  });

  it('summarizes latency samples', () => {
    const summary = summarizeLatencySamples([12, 14, 16, 18], 1);
    expect(summary.medianMs).toBe(15);
    expect(summary.failures).toBe(1);
  });

  it('counts jitter glitches', () => {
    expect(countGlitchOnsets([20, 21, 22, 40], 8)).toBe(1);
  });
});
