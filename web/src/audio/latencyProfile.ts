/**
 * Evidence-backed Tone.js context latency settings.
 *
 * Experimental: lookAhead 0 (minimum scheduling horizon). Desktop sweep
 * estimated ~10 ms at lookAhead 0 vs ~30 ms at 0.02. Revert if glitches appear.
 */
import { resolveLayoutTier, type LayoutTier } from '../layout/breakpoints';
import type { LatencyContextConfig } from './latencyScenarios';

export interface LatencyProfile extends LatencyContextConfig {
  id: string;
  label: string;
}

const PRODUCTION_LOOK_AHEAD_SEC = 0;

const DESKTOP_LATENCY_PROFILE: LatencyProfile = {
  id: 'desktop',
  label: 'Desktop low-latency',
  lookAhead: PRODUCTION_LOOK_AHEAD_SEC,
  latencyHint: 'interactive',
};

const PHONE_LATENCY_PROFILE: LatencyProfile = {
  id: 'phone',
  label: 'Phone low-latency',
  lookAhead: PRODUCTION_LOOK_AHEAD_SEC,
  latencyHint: 'interactive',
};

const TABLET_LATENCY_PROFILE: LatencyProfile = {
  id: 'tablet',
  label: 'Tablet low-latency',
  lookAhead: PRODUCTION_LOOK_AHEAD_SEC,
  latencyHint: 'interactive',
};

export const PRODUCTION_LATENCY_PROFILES: Record<LayoutTier, LatencyProfile> = {
  desktop: DESKTOP_LATENCY_PROFILE,
  phone: PHONE_LATENCY_PROFILE,
  tablet: TABLET_LATENCY_PROFILE,
};

export function getLatencyProfileForTier(tier?: LayoutTier): LatencyProfile {
  return PRODUCTION_LATENCY_PROFILES[tier ?? resolveLayoutTier()];
}

export function resolveUpdateInterval(config: LatencyContextConfig): number {
  if (config.updateInterval != null) {
    return config.updateInterval;
  }
  return config.lookAhead > 0 ? config.lookAhead / 2 : 0.01;
}
