/**
 * Render gain-staging scenarios and print peak/RMS metrics.
 *
 * Usage:
 *   npm run measure:gain
 *   npm run measure:gain -- --write-baseline
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import {
  SUSTAIN_PEAK_PASS_DB,
  type AudioAnalysisResult,
} from '../src/audio/audioBufferAnalysis.ts';
import { GAIN_STAGING_SCENARIOS } from '../src/audio/gainStagingScenarios.ts';

const writeBaseline = process.argv.includes('--write-baseline');

function formatDb(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '-inf';
}

function printRow(
  id: string,
  result: AudioAnalysisResult,
  failed: boolean,
): void {
  const prefix = failed ? 'FAIL' : ' ok ';
  console.log(
    `${prefix} | ${id.padEnd(36)} | peak ${formatDb(result.peakDb).padStart(7)} | sustain ${formatDb(result.sustainPeakDb).padStart(7)} | rms ${formatDb(result.sustainRmsDb).padStart(7)} | clips ${result.clippedSampleCount}`,
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

async function main(): Promise<void> {
  const server = await startDevServer();
  const baseUrl = server.resolvedUrls?.local[0];
  if (!baseUrl) {
    throw new Error('Failed to start Vite dev server for gain measurement');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/src/audio/measureGainStagingHarness.html`, {
    waitUntil: 'networkidle',
    timeout: 120_000,
  });
  await page.waitForFunction(
    () =>
      typeof (window as Window & {
        renderGainScenario?: (scenarioId: string) => Promise<unknown>;
      }).renderGainScenario === 'function',
    undefined,
    { timeout: 120_000 },
  );

  const baseline: Record<string, { sustainPeakDb: number }> = {};
  let failures = 0;

  for (const scenario of GAIN_STAGING_SCENARIOS) {
    const result = await page.evaluate(async (scenarioId) => {
      const render = (window as Window & {
        renderGainScenario: (id: string) => Promise<AudioAnalysisResult>;
      }).renderGainScenario;
      return render(scenarioId);
    }, scenario.id);

    const failed =
      result.clippedSampleCount > 0 ||
      result.sustainPeakDb > SUSTAIN_PEAK_PASS_DB;

    if (failed) {
      failures += 1;
    }

    printRow(scenario.id, result, failed);
    baseline[scenario.id] = {
      sustainPeakDb: result.sustainPeakDb,
    };
  }

  await browser.close();
  await server.close();

  if (writeBaseline) {
    const target = path.join(
      process.cwd(),
      'src',
      'audio',
      'gainStaging.baseline.json',
    );
    await writeFile(target, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(`\nWrote baseline to ${target}`);
  }

  if (failures > 0) {
    console.error(`\n${failures} scenario(s) failed hard limits.`);
    process.exitCode = 1;
  }
}

await main();
