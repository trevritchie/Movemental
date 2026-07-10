import { describe, expect, it } from 'vitest';
import { SUSTAIN_PEAK_PASS_DB } from './audioBufferAnalysis';
import { GAIN_STAGING_SCENARIOS } from './gainStagingScenarios';
import { renderScenario } from './renderGainStagingScenario';

describe('gain staging offline renders', () => {
  it.each(GAIN_STAGING_SCENARIOS.map((scenario) => [scenario.id, scenario]))(
    '%s stays below limiter ceiling without clipping',
    async (_id, scenario) => {
      const result = await renderScenario(scenario);

      expect(result.clippedSampleCount).toBe(0);
      expect(result.sustainPeakDb).toBeLessThanOrEqual(SUSTAIN_PEAK_PASS_DB);
    },
    120_000,
  );
});
