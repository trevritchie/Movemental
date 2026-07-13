import { describe, expect, it } from 'vitest';
import * as Tone from 'tone';
import {
  LATENCY_LIVE_TEST_TIMEOUT_MS,
  LATENCY_P95_PASS_MS,
  estimateSchedulingLatencyMs,
} from './latencyAnalysis';
import { getLatencyProfileForTier, resolveUpdateInterval } from './latencyProfile';
import { toToneLatencyContextOptions } from './latencyScenarios';

describe('latency live benchmarks', () => {
  it(
    'constructs a low-latency Tone context in the browser',
    () => {
      const profile = getLatencyProfileForTier('desktop');
      const context = new Tone.Context(
        toToneLatencyContextOptions(
          profile,
          resolveUpdateInterval(profile),
        ),
      );

      expect(context.lookAhead).toBe(profile.lookAhead);
      expect(context.latencyHint).toBe(profile.latencyHint);

      const estimate = estimateSchedulingLatencyMs({
        baseLatencyMs: 0,
        outputLatencyMs: 10,
        totalReportedMs: 10,
        lookAheadSec: context.lookAhead,
        updateIntervalSec: context.updateInterval,
        latencyHint: context.latencyHint,
        sampleRate: context.sampleRate,
      });
      expect(estimate).toBeLessThanOrEqual(LATENCY_P95_PASS_MS);
    },
    LATENCY_LIVE_TEST_TIMEOUT_MS,
  );

  it(
    'uses the same lookAhead on phone and desktop',
    () => {
      const phone = getLatencyProfileForTier('phone');
      const desktop = getLatencyProfileForTier('desktop');
      const phoneContext = new Tone.Context(
        toToneLatencyContextOptions(
          phone,
          resolveUpdateInterval(phone),
        ),
      );

      expect(phoneContext.lookAhead).toBe(desktop.lookAhead);
      expect(phoneContext.lookAhead).toBe(phone.lookAhead);
    },
    LATENCY_LIVE_TEST_TIMEOUT_MS,
  );
});
