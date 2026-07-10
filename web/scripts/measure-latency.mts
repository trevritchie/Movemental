/**
 * Live latency measurement CLI (Playwright + real AudioContext).
 *
 * Usage:
 *   npm run measure:latency
 *   npm run measure:latency -- --sweep
 *   npm run measure:latency -- --stress --full-stress
 *   npm run measure:latency -- --write-baseline
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import {
  LATENCY_CI_STRESS_DURATION_MS,
  LATENCY_HARNESS_LOAD_TIMEOUT_MS,
  LATENCY_P95_PASS_MS,
  LATENCY_SCENARIO_TIMEOUT_MS,
  LATENCY_STRESS_DURATION_MS,
  type LatencySampleSummary,
} from '../src/audio/latencyAnalysis.ts';
import {
  LATENCY_SWEEP_SCENARIOS,
} from '../src/audio/latencyScenarios.ts';
import {
  LATENCY_STRESS_SCENARIO,
  PRODUCTION_DESKTOP_LATENCY_SCENARIO,
  PRODUCTION_PHONE_LATENCY_SCENARIO,
} from '../src/audio/productionLatencyScenario.ts';
import type {
  LatencyBenchmarkResult,
  LatencyStressResult,
} from '../src/audio/latencyRunner.ts';

const runSweep = process.argv.includes('--sweep');
const runStress = process.argv.includes('--stress');
const writeBaseline = process.argv.includes('--write-baseline');
const runFullStress = process.argv.includes('--full-stress');
const throttleArg = process.argv.find((arg) => arg.startsWith('--throttle'));
const throttleRate = throttleArg
  ? Number(throttleArg.split('=')[1] ?? process.argv[process.argv.indexOf(throttleArg) + 1])
  : 0;

interface HarnessWindow extends Window {
  runLatencyScenario: (scenarioId: string) => Promise<LatencyBenchmarkResult>;
  runLatencyStress: (
    scenarioId?: string,
    durationMs?: number,
  ) => Promise<LatencyStressResult>;
}

function formatMs(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : 'n/a';
}

function printBenchmarkRow(
  id: string,
  summary: LatencySampleSummary,
  contextTotalMs: number,
): void {
  console.log(
    ` ok  | ${id.padEnd(28)} | med ${formatMs(summary.medianMs).padStart(6)} ms | p95 ${formatMs(summary.p95Ms).padStart(6)} ms | fail ${String(summary.failures).padStart(2)} | ctx ${formatMs(contextTotalMs).padStart(5)} ms`,
  );
}

function printStressRow(id: string, result: LatencyStressResult): void {
  const status = result.contextSuspended || result.onsetFailures > 0 ? 'FAIL' : ' ok ';
  console.log(
    `${status} | ${id.padEnd(28)} | triggers ${String(result.triggerCount).padStart(3)} | onsetFail ${String(result.onsetFailures).padStart(2)} | glitch ${String(result.glitchCount).padStart(2)} | suspended ${result.contextSuspended}`,
  );
}

async function startDevServer(): Promise<ViteDevServer> {
  const server = await createServer({
    configFile: path.join(process.cwd(), 'vite.config.ts'),
    server: { port: 0, strictPort: false },
  });
  await server.listen();
  return server;
}

async function prepareHarnessPage(
  baseUrl: string,
): Promise<{ page: Page; browser: Awaited<ReturnType<typeof chromium.launch>> }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  if (throttleRate > 0) {
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', {
      rate: throttleRate,
    });
  }

  await page.goto(`${baseUrl}/src/audio/measureLatencyHarness.html`, {
    waitUntil: 'networkidle',
    timeout: LATENCY_HARNESS_LOAD_TIMEOUT_MS,
  });
  await page.waitForFunction(
    () =>
      typeof (window as HarnessWindow).runLatencyScenario === 'function',
    undefined,
    { timeout: LATENCY_HARNESS_LOAD_TIMEOUT_MS },
  );

  return { page, browser };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function runScenario(
  page: Page,
  scenarioId: string,
): Promise<LatencyBenchmarkResult> {
  return withTimeout(
    page.evaluate(async (id) => {
      const harness = window as HarnessWindow;
      return harness.runLatencyScenario(id);
    }, scenarioId),
    LATENCY_SCENARIO_TIMEOUT_MS,
    `Scenario ${scenarioId}`,
  );
}

async function runStressScenario(
  page: Page,
  scenarioId: string,
  durationMs: number,
): Promise<LatencyStressResult> {
  const stressTimeoutMs =
    durationMs + LATENCY_SCENARIO_TIMEOUT_MS;
  return withTimeout(
    page.evaluate(
      async ({ id, duration }) => {
        const harness = window as HarnessWindow;
        return harness.runLatencyStress(id, duration);
      },
      { id: scenarioId, duration: durationMs },
    ),
    stressTimeoutMs,
    `Stress ${scenarioId}`,
  );
}

async function main(): Promise<void> {
  const server = await startDevServer();
  const baseUrl = server.resolvedUrls?.local[0];
  if (!baseUrl) {
    throw new Error('Failed to start Vite dev server for latency measurement');
  }

  const { page, browser } = await prepareHarnessPage(baseUrl);
  const baseline: Record<string, { medianMs: number; p95Ms: number }> = {};
  const scenarios = runSweep
    ? [
        ...LATENCY_SWEEP_SCENARIOS,
        PRODUCTION_DESKTOP_LATENCY_SCENARIO,
        PRODUCTION_PHONE_LATENCY_SCENARIO,
      ]
    : [
        LATENCY_SWEEP_SCENARIOS.find(
          (scenario) => scenario.id === 'baseline-tone-defaults',
        )!,
        PRODUCTION_DESKTOP_LATENCY_SCENARIO,
      ];

  console.log('Latency benchmark (live AudioContext)');
  if (throttleRate > 0) {
    console.log(`CPU throttle: ${throttleRate}x`);
  }

  for (const scenario of scenarios) {
    const result = await runScenario(page, scenario.id);
    printBenchmarkRow(
      scenario.id,
      result.summary,
      result.contextReport.totalReportedMs,
    );
    baseline[scenario.id] = {
      medianMs: result.summary.medianMs,
      p95Ms: result.summary.p95Ms,
    };
  }

  if (runStress) {
    console.log('\nStress benchmark');
    const stressDurationMs = runFullStress
      ? LATENCY_STRESS_DURATION_MS
      : LATENCY_CI_STRESS_DURATION_MS;
    const stressResult = await runStressScenario(
      page,
      LATENCY_STRESS_SCENARIO.id,
      stressDurationMs,
    );
    printStressRow(LATENCY_STRESS_SCENARIO.id, stressResult);
  }

  await browser.close();
  await server.close();

  if (writeBaseline) {
    const target = path.join(
      process.cwd(),
      'src',
      'audio',
      'latency.baseline.json',
    );
    await writeFile(target, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(`\nWrote baseline to ${target}`);
  }

  const production = baseline['production-desktop'] ?? baseline['lookAhead-0_02'];
  if (
    production &&
    Number.isFinite(production.p95Ms) &&
    production.p95Ms > LATENCY_P95_PASS_MS
  ) {
    console.error(
      `\nProduction candidate p95 ${production.p95Ms.toFixed(1)} ms exceeds ${LATENCY_P95_PASS_MS} ms.`,
    );
    process.exitCode = 1;
  }
}

await main();
