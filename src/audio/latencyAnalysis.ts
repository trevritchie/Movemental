/**
 * Live tap-to-onset metrics for Web Audio latency tuning.
 */

export const LATENCY_WARMUP_TRIALS = 1;
export const LATENCY_MEASUREMENT_TRIALS = 5;
export const LATENCY_ONSET_TIMEOUT_MS = 300;
export const LATENCY_AUDIO_CLOCK_WAIT_MS = 150;
export const LATENCY_ONSET_THRESHOLD = 0.008;
export const LATENCY_ONSET_CONSECUTIVE_FRAMES = 2;
export const LATENCY_GLITCH_JITTER_MS = 8;
export const LATENCY_P95_PASS_MS = 40;
export const LATENCY_STRESS_INTERVAL_MS = 125;
/** Full manual stress duration (`measure:latency --stress`). */
export const LATENCY_STRESS_DURATION_MS = 30_000;
/** Shorter stress for CI and default scripted runs. */
export const LATENCY_CI_STRESS_DURATION_MS = 5_000;
/** Playwright per-scenario evaluate budget. */
export const LATENCY_SCENARIO_TIMEOUT_MS = 15_000;
/** Playwright page load / harness ready budget. */
export const LATENCY_HARNESS_LOAD_TIMEOUT_MS = 30_000;
/** Vitest browser project timeout for live latency smoke tests. */
export const LATENCY_LIVE_TEST_TIMEOUT_MS = 15_000;

export interface LatencySampleSummary {
  medianMs: number;
  p95Ms: number;
  stdDevMs: number;
  samples: number[];
  failures: number;
}

export interface ContextLatencyReport {
  baseLatencyMs: number;
  outputLatencyMs: number;
  totalReportedMs: number;
  lookAheadSec: number;
  updateIntervalSec: number;
  latencyHint: string | number;
  sampleRate: number;
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return Number.NaN;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return Number.NaN;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index]!;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
}

export function summarizeLatencySamples(
  samples: number[],
  failures: number,
): LatencySampleSummary {
  return {
    medianMs: median(samples),
    p95Ms: percentile(samples, 95),
    stdDevMs: stdDev(samples),
    samples,
    failures,
  };
}

export function peakAbsTimeDomain(buffer: Float32Array): number {
  let peak = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    peak = Math.max(peak, Math.abs(buffer[index]!));
  }
  return peak;
}

export function measureNoiseFloor(
  analyser: AnalyserNode,
  frames: number = 5,
): number {
  const buffer = new Float32Array(analyser.fftSize);
  let noiseFloor = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    analyser.getFloatTimeDomainData(buffer);
    noiseFloor = Math.max(noiseFloor, peakAbsTimeDomain(buffer));
  }
  return noiseFloor;
}

export function resolveOnsetThreshold(noiseFloor: number): number {
  return Math.max(LATENCY_ONSET_THRESHOLD, noiseFloor * 4 + 0.002);
}

export function estimateSchedulingLatencyMs(
  report: ContextLatencyReport,
): number {
  return report.lookAheadSec * 1000 + report.totalReportedMs;
}

async function waitForAudioTime(
  context: { currentTime: number },
  targetTime: number,
  timeoutMs: number = LATENCY_ONSET_TIMEOUT_MS,
): Promise<void> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (context.currentTime >= targetTime) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error('Timed out waiting for audio clock');
}

/**
 * Measure wall-clock delay until the scheduled attack time is reached,
 * plus reported output latency (tap-to-device estimate).
 */
export async function measureScheduledTapLatencyMs(
  toneContext: { rawContext: { currentTime: number }; now: () => number },
  contextReport: ContextLatencyReport,
  trigger: (attackTime: number) => void,
): Promise<number> {
  const raw = toneContext.rawContext;
  const triggerPerfMs = performance.now();
  const attackTime = toneContext.now();
  trigger(attackTime);
  try {
    await waitForAudioTime(
      raw,
      attackTime,
      LATENCY_AUDIO_CLOCK_WAIT_MS,
    );
    const schedulingMs = performance.now() - triggerPerfMs;
    return schedulingMs + contextReport.outputLatencyMs;
  } catch {
    return estimateSchedulingLatencyMs(contextReport);
  }
}

export function waitForMeterOnsetMs(
  meter: { getValue: () => number },
  trigger: () => void,
  options: {
    timeoutMs?: number;
    threshold?: number;
  } = {},
): Promise<number> {
  const timeoutMs = options.timeoutMs ?? LATENCY_ONSET_TIMEOUT_MS;
  const threshold = options.threshold ?? 0.02;
  const triggerPerfMs = performance.now();
  trigger();

  return new Promise((resolve, reject) => {
    let consecutive = 0;

    const poll = () => {
      const elapsed = performance.now() - triggerPerfMs;
      if (elapsed > timeoutMs) {
        reject(new Error('Onset detection timed out'));
        return;
      }

      const level = meter.getValue();
      const amplitude = typeof level === 'number' ? Math.abs(level) : 0;
      if (amplitude > threshold) {
        consecutive += 1;
        if (consecutive >= LATENCY_ONSET_CONSECUTIVE_FRAMES) {
          resolve(elapsed);
          return;
        }
      } else {
        consecutive = 0;
      }

      setTimeout(poll, 4);
    };

    poll();
  });
}

export function countGlitchOnsets(
  onsetsMs: number[],
  jitterThresholdMs: number = LATENCY_GLITCH_JITTER_MS,
): number {
  if (onsetsMs.length < 2) {
    return 0;
  }

  let glitches = 0;
  const expected = median(onsetsMs);
  for (const onsetMs of onsetsMs) {
    if (Math.abs(onsetMs - expected) > jitterThresholdMs) {
      glitches += 1;
    }
  }
  return glitches;
}
