/**
 * Latency benchmark scenario definitions for sweeps and regression tests.
 */
import type { ContextOptions } from 'tone';

export type LatencyHintValue = 'interactive' | 'balanced' | number;

export interface LatencyContextConfig {
  lookAhead: number;
  updateInterval?: number;
  latencyHint: LatencyHintValue;
}

export interface LatencyScenario {
  id: string;
  label: string;
  phase: 'baseline' | 'lookAhead' | 'latencyHint' | 'updateInterval' | 'production' | 'stress';
  config: LatencyContextConfig;
  attackOffsetSec?: number;
  trialCount?: number;
  midiNotes?: number[];
}

export const DEFAULT_LATENCY_MEASUREMENT_NOTES = [60];

/** Tone.js 15 defaults (pre-tuning reference). */
export const TONE_DEFAULT_LATENCY_CONFIG: LatencyContextConfig = {
  lookAhead: 0.1,
  updateInterval: 0.05,
  latencyHint: 'interactive',
};

export const LOOK_AHEAD_SWEEP_VALUES = [
  0,
  0.005,
  0.01,
  0.02,
  0.03,
  0.05,
  0.1,
] as const;

export const LATENCY_HINT_SWEEP_VALUES: LatencyHintValue[] = [
  'interactive',
  'balanced',
  0.01,
  0.02,
];

function lookAheadScenario(value: number): LatencyScenario {
  return {
    id: `lookAhead-${String(value).replace('.', '_')}`,
    label: `lookAhead ${value}s`,
    phase: 'lookAhead',
    config: {
      lookAhead: value,
      latencyHint: 'interactive',
    },
  };
}

function latencyHintScenario(hint: LatencyHintValue): LatencyScenario {
  const idSuffix =
    typeof hint === 'number' ? String(hint).replace('.', '_') : hint;
  return {
    id: `latencyHint-${idSuffix}`,
    label: `latencyHint ${hint}`,
    phase: 'latencyHint',
    config: {
      lookAhead: 0.02,
      latencyHint: hint,
    },
  };
}

export const LATENCY_SWEEP_SCENARIOS: LatencyScenario[] = [
  {
    id: 'baseline-tone-defaults',
    label: 'Tone.js defaults',
    phase: 'baseline',
    config: TONE_DEFAULT_LATENCY_CONFIG,
  },
  ...LOOK_AHEAD_SWEEP_VALUES.map(lookAheadScenario),
  ...LATENCY_HINT_SWEEP_VALUES.map(latencyHintScenario),
  {
    id: 'updateInterval-fixed-10ms',
    label: 'updateInterval 10ms at lookAhead 20ms',
    phase: 'updateInterval',
    config: {
      lookAhead: 0.02,
      updateInterval: 0.01,
      latencyHint: 'interactive',
    },
  },
  {
    id: 'attackOffset-0',
    label: 'attack offset 0ms (retrigger path)',
    phase: 'baseline',
    config: {
      lookAhead: 0.02,
      latencyHint: 'interactive',
    },
    attackOffsetSec: 0,
  },
  {
    id: 'attackOffset-15ms',
    label: 'attack offset 15ms (retrigger path)',
    phase: 'baseline',
    config: {
      lookAhead: 0.02,
      latencyHint: 'interactive',
    },
    attackOffsetSec: 0.015,
  },
];

export function toToneLatencyContextOptions(
  config: LatencyContextConfig,
  updateInterval: number,
): Partial<ContextOptions> {
  return {
    lookAhead: config.lookAhead,
    latencyHint: config.latencyHint as ContextOptions['latencyHint'],
    updateInterval,
  };
}
