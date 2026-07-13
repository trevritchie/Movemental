/**
 * Production latency scenario for regression tests and stress benchmarks.
 */
import { getLatencyProfileForTier } from './latencyProfile';
import type { LatencyScenario } from './latencyScenarios';

export function buildProductionLatencyScenario(
  tier: 'desktop' | 'phone' = 'desktop',
): LatencyScenario {
  const profile = getLatencyProfileForTier(tier);
  return {
    id: `production-${profile.id}`,
    label: profile.label,
    phase: 'production',
    config: {
      lookAhead: profile.lookAhead,
      latencyHint: profile.latencyHint,
      updateInterval: profile.updateInterval,
    },
  };
}

export const PRODUCTION_DESKTOP_LATENCY_SCENARIO =
  buildProductionLatencyScenario('desktop');

export const PRODUCTION_PHONE_LATENCY_SCENARIO =
  buildProductionLatencyScenario('phone');

export const LATENCY_STRESS_SCENARIO: LatencyScenario = {
  ...PRODUCTION_DESKTOP_LATENCY_SCENARIO,
  id: 'stress-production',
  label: 'Production profile stress',
  phase: 'stress',
  midiNotes: [60],
};
