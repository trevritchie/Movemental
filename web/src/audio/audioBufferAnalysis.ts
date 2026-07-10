/**
 * PCM analysis helpers for offline gain-staging renders.
 */
import { LIMITER_CEILING_DB, dbToGain } from './outputProfiles';

export interface AudioAnalysisWindow {
  startSec: number;
  endSec: number;
}

export interface AudioAnalysisResult {
  peakDb: number;
  rmsDb: number;
  bodyPeakDb: number;
  bodyRmsDb: number;
  sustainPeakDb: number;
  sustainRmsDb: number;
  clippedSampleCount: number;
  nearLimiterCount: number;
}

/** Chord body window: after attack, before long decay tails (preset matching). */
export const DEFAULT_BODY_WINDOW: AudioAnalysisWindow = {
  startSec: 0.2,
  endSec: 1.0,
};

export interface AnalyzeAudioBufferOptions {
  sustainWindow: AudioAnalysisWindow;
  bodyWindow?: AudioAnalysisWindow;
}

const CLIP_LINEAR_THRESHOLD = 0.999;
const NEAR_LIMITER_LINEAR = dbToGain(LIMITER_CEILING_DB);

function linearToDb(linear: number): number {
  if (linear <= 0) {
    return -Infinity;
  }
  return 20 * Math.log10(linear);
}

function measurePeakLinear(samples: Float32Array): number {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const abs = Math.abs(samples[index]!);
    if (abs > peak) {
      peak = abs;
    }
  }
  return peak;
}

function measureRmsLinear(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }
  let sumSquares = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = samples[index]!;
    sumSquares += value * value;
  }
  return Math.sqrt(sumSquares / samples.length);
}

function countAboveThreshold(
  samples: Float32Array,
  threshold: number,
): number {
  let count = 0;
  for (let index = 0; index < samples.length; index += 1) {
    if (Math.abs(samples[index]!) >= threshold) {
      count += 1;
    }
  }
  return count;
}

function sliceWindow(
  buffer: AudioBuffer,
  window: AudioAnalysisWindow,
): Float32Array {
  const startSample = Math.max(
    0,
    Math.floor(window.startSec * buffer.sampleRate),
  );
  const endSample = Math.min(
    buffer.length,
    Math.ceil(window.endSec * buffer.sampleRate),
  );
  const length = Math.max(0, endSample - startSample);
  const merged = new Float32Array(length);

  if (length === 0) {
    return merged;
  }

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const channelData = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const value = channelData[startSample + index] ?? 0;
      const existing = merged[index] ?? 0;
      merged[index] = Math.max(Math.abs(existing), Math.abs(value));
    }
  }

  return merged;
}

function mergeChannelsPeak(buffer: AudioBuffer): Float32Array {
  const merged = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const channelData = buffer.getChannelData(channel);
    for (let index = 0; index < buffer.length; index += 1) {
      const abs = Math.abs(channelData[index]!);
      if (abs > (merged[index] ?? 0)) {
        merged[index] = abs;
      }
    }
  }
  return merged;
}

export function analyzeAudioBuffer(
  buffer: AudioBuffer,
  options: AnalyzeAudioBufferOptions,
): AudioAnalysisResult {
  const full = mergeChannelsPeak(buffer);
  const bodyWindow = options.bodyWindow ?? DEFAULT_BODY_WINDOW;
  const body = sliceWindow(buffer, bodyWindow);
  const sustain = sliceWindow(buffer, options.sustainWindow);

  const peakLinear = measurePeakLinear(full);
  const bodyPeakLinear = measurePeakLinear(body);
  const sustainPeakLinear = measurePeakLinear(sustain);
  const rmsLinear = measureRmsLinear(full);
  const bodyRmsLinear = measureRmsLinear(body);
  const sustainRmsLinear = measureRmsLinear(sustain);

  return {
    peakDb: linearToDb(peakLinear),
    rmsDb: linearToDb(rmsLinear),
    bodyPeakDb: linearToDb(bodyPeakLinear),
    bodyRmsDb: linearToDb(bodyRmsLinear),
    sustainPeakDb: linearToDb(sustainPeakLinear),
    sustainRmsDb: linearToDb(sustainRmsLinear),
    clippedSampleCount: countAboveThreshold(full, CLIP_LINEAR_THRESHOLD),
    nearLimiterCount: countAboveThreshold(full, NEAR_LIMITER_LINEAR),
  };
}

/** Pass threshold with measurement tolerance below LIMITER_CEILING_DB. */
export const SUSTAIN_PEAK_PASS_DB = LIMITER_CEILING_DB + 0.3;

/** Target body peak for preset loudness matching (phone / smallSpeakers). */
export const PRESET_LOUDNESS_TARGET_BODY_PEAK_DB = -9;

/** Acceptable spread after matching (preserves category dynamics). */
export const PRESET_LOUDNESS_MATCH_TOLERANCE_DB = 2;
