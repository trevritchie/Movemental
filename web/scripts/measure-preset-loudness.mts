/**
 * Measure body-peak loudness for every preset and suggest volumeDb trims.
 *
 * Usage:
 *   npm run measure:loudness
 *   npm run measure:loudness -- --json
 */
import { chromium } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import path from 'node:path';
import {
  PRESET_LOUDNESS_TARGET_BODY_PEAK_DB,
  SUSTAIN_PEAK_PASS_DB,
  type AudioAnalysisResult,
} from '../src/audio/audioBufferAnalysis.ts';
import { PRESET_LOUDNESS_SCENARIOS } from '../src/audio/presetLoudnessScenarios.ts';
import { getSynthPreset } from '../src/audio/synthPresets.ts';

const emitJson = process.argv.includes('--json');

interface PresetLoudnessRow {
  presetId: string;
  volumeDb: number;
  bodyPeakDb: number;
  peakDb: number;
  sustainPeakDb: number;
  clippedSampleCount: number;
  suggestedVolumeDb: number;
  trimDb: number;
}

function formatDb(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '-inf';
}

function clampVolumeDb(db: number): number {
  return Math.max(-24, Math.min(-2, db));
}

function suggestTrim(
  currentVolumeDb: number,
  bodyPeakDb: number,
): { trimDb: number; suggestedVolumeDb: number } {
  const trimDb = PRESET_LOUDNESS_TARGET_BODY_PEAK_DB - bodyPeakDb;
  return {
    trimDb,
    suggestedVolumeDb: clampVolumeDb(currentVolumeDb + trimDb),
  };
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
    throw new Error('Failed to start Vite dev server for loudness measurement');
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

  const rows: PresetLoudnessRow[] = [];

  for (const scenario of PRESET_LOUDNESS_SCENARIOS) {
    const result = await page.evaluate(async (scenarioId) => {
      const render = (window as Window & {
        renderGainScenario: (id: string) => Promise<AudioAnalysisResult>;
      }).renderGainScenario;
      return render(scenarioId);
    }, scenario.id);

    const preset = getSynthPreset(scenario.presetId);
    const currentVolumeDb = preset.volumeDb ?? -6;
    const { trimDb, suggestedVolumeDb } = suggestTrim(
      currentVolumeDb,
      result.bodyPeakDb,
    );

    rows.push({
      presetId: scenario.presetId,
      volumeDb: currentVolumeDb,
      bodyPeakDb: result.bodyPeakDb,
      peakDb: result.peakDb,
      sustainPeakDb: result.sustainPeakDb,
      clippedSampleCount: result.clippedSampleCount,
      suggestedVolumeDb,
      trimDb,
    });
  }

  await browser.close();
  await server.close();

  if (emitJson) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  console.log(
    `Target body peak: ${PRESET_LOUDNESS_TARGET_BODY_PEAK_DB} dBFS (phone / smallSpeakers, 0.2-1.0 s window)`,
  );
  console.log(
    'preset'.padEnd(20) +
      ' | vol'.padStart(6) +
      ' | body'.padStart(7) +
      ' | peak'.padStart(7) +
      ' | sustain'.padStart(8) +
      ' | trim'.padStart(7) +
      ' | suggest'.padStart(8) +
      ' | clips',
  );

  let failures = 0;
  for (const row of rows) {
    const hot =
      row.clippedSampleCount > 0 ||
      row.peakDb > SUSTAIN_PEAK_PASS_DB ||
      row.bodyPeakDb > SUSTAIN_PEAK_PASS_DB;
    if (hot) {
      failures += 1;
    }
    const prefix = hot ? '!' : ' ';
    console.log(
      `${prefix}${row.presetId.padEnd(19)} | ${formatDb(row.volumeDb).padStart(6)} | ${formatDb(row.bodyPeakDb).padStart(7)} | ${formatDb(row.peakDb).padStart(7)} | ${formatDb(row.sustainPeakDb).padStart(8)} | ${formatDb(row.trimDb).padStart(7)} | ${formatDb(row.suggestedVolumeDb).padStart(8)} | ${row.clippedSampleCount}`,
    );
  }

  if (failures > 0) {
    console.error(`\n${failures} preset(s) exceed hard limits before retune.`);
  }
}

await main();
