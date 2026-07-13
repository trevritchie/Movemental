import { describe, expect, it } from 'vitest';
import {
  getLatencyProfileForTier,
  PRODUCTION_LATENCY_PROFILES,
} from './latencyProfile';
import { estimateSchedulingLatencyMs } from './latencyAnalysis';

describe('latencyProfile', () => {
  it('uses lower lookAhead on desktop than Tone defaults', () => {
    const desktop = getLatencyProfileForTier('desktop');
    expect(desktop.lookAhead).toBe(0);
    expect(desktop.lookAhead).toBeLessThan(0.1);
  });

  it('uses the same lookAhead on phone and desktop', () => {
    expect(PRODUCTION_LATENCY_PROFILES.phone.lookAhead).toBe(
      PRODUCTION_LATENCY_PROFILES.desktop.lookAhead,
    );
  });

  it('keeps estimated scheduling latency under the p95 pass ceiling', () => {
    const desktopEstimate = estimateSchedulingLatencyMs({
      baseLatencyMs: 0,
      outputLatencyMs: 10,
      totalReportedMs: 10,
      lookAheadSec: PRODUCTION_LATENCY_PROFILES.desktop.lookAhead,
      updateIntervalSec: 0.01,
      latencyHint: 'interactive',
      sampleRate: 48000,
    });
    expect(desktopEstimate).toBeLessThanOrEqual(40);
  });
});
