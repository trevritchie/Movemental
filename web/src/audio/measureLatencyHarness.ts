import {
  runLatencyBenchmark,
  runLatencyStress,
  type LatencyBenchmarkResult,
  type LatencyStressResult,
} from './latencyRunner';
import {
  LATENCY_SWEEP_SCENARIOS,
  type LatencyScenario,
} from './latencyScenarios';
import {
  LATENCY_STRESS_SCENARIO,
  PRODUCTION_DESKTOP_LATENCY_SCENARIO,
  PRODUCTION_PHONE_LATENCY_SCENARIO,
} from './productionLatencyScenario';

function getLatencyScenario(id: string): LatencyScenario | undefined {
  if (id === 'stress-production') {
    return LATENCY_STRESS_SCENARIO;
  }
  if (id === 'production-desktop') {
    return PRODUCTION_DESKTOP_LATENCY_SCENARIO;
  }
  if (id === 'production-phone') {
    return PRODUCTION_PHONE_LATENCY_SCENARIO;
  }
  return LATENCY_SWEEP_SCENARIOS.find((scenario) => scenario.id === id);
}

declare global {
  interface Window {
    runLatencyScenario: (scenarioId: string) => Promise<LatencyBenchmarkResult>;
    runLatencyStress: (
      scenarioId?: string,
      durationMs?: number,
    ) => Promise<LatencyStressResult>;
    listLatencyScenarios: () => LatencyScenario[];
  }
}

window.listLatencyScenarios = () => LATENCY_SWEEP_SCENARIOS;

window.runLatencyScenario = async (scenarioId: string) => {
  const scenario = getLatencyScenario(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown latency scenario: ${scenarioId}`);
  }
  return runLatencyBenchmark(scenario);
};

window.runLatencyStress = async (
  scenarioId: string = LATENCY_STRESS_SCENARIO.id,
  durationMs?: number,
) => {
  const scenario = getLatencyScenario(scenarioId) ?? {
    ...LATENCY_STRESS_SCENARIO,
    id: scenarioId,
  };
  return runLatencyStress(scenario, durationMs);
};
