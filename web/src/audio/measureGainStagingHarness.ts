import type { AudioAnalysisResult } from './audioBufferAnalysis';
import { GAIN_STAGING_SCENARIOS } from './gainStagingScenarios';
import { PRESET_LOUDNESS_SCENARIOS } from './presetLoudnessScenarios';
import { renderScenario } from './renderGainStagingScenario';

declare global {
  interface Window {
    renderGainScenario: (scenarioId: string) => Promise<AudioAnalysisResult>;
  }
}

const scenarioById = new Map(
  [...GAIN_STAGING_SCENARIOS, ...PRESET_LOUDNESS_SCENARIOS].map(
    (scenario) => [scenario.id, scenario],
  ),
);

window.renderGainScenario = async (scenarioId: string) => {
  const scenario = scenarioById.get(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioId}`);
  }
  return renderScenario(scenario);
};
