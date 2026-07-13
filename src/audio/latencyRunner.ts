/**
 * Live latency benchmark runner (real AudioContext + onset detection).
 */
import * as Tone from 'tone';
import {
  countGlitchOnsets,
  LATENCY_CI_STRESS_DURATION_MS,
  LATENCY_MEASUREMENT_TRIALS,
  LATENCY_STRESS_INTERVAL_MS,
  estimateSchedulingLatencyMs,
  measureScheduledTapLatencyMs,
  summarizeLatencySamples,
  type ContextLatencyReport,
  type LatencySampleSummary,
} from './latencyAnalysis';
import type { LatencyContextConfig, LatencyScenario } from './latencyScenarios';
import { DEFAULT_LATENCY_MEASUREMENT_NOTES, toToneLatencyContextOptions } from './latencyScenarios';
import {
  getLatencyProfileForTier,
  resolveUpdateInterval,
  type LatencyProfile,
} from './latencyProfile';

export interface LatencyBenchmarkResult {
  scenarioId: string;
  summary: LatencySampleSummary;
  contextReport: ContextLatencyReport;
  attackOffsetSec: number;
}

export interface LatencyStressResult {
  scenarioId: string;
  triggerCount: number;
  onsetFailures: number;
  glitchCount: number;
  contextSuspended: boolean;
  contextReport: ContextLatencyReport;
}

let activeDispose: (() => Promise<void>) | null = null;

function resolveConfigUpdateInterval(config: LatencyContextConfig): number {
  return resolveUpdateInterval(config);
}

export function readContextLatencyReport(
  context: Tone.Context,
): ContextLatencyReport {
  const raw = context.rawContext;
  const baseLatencySec =
    'baseLatency' in raw ? (raw.baseLatency as number) : 0;
  const outputLatencySec =
    'outputLatency' in raw ? (raw.outputLatency as number) : 0;

  return {
    baseLatencyMs: baseLatencySec * 1000,
    outputLatencyMs: outputLatencySec * 1000,
    totalReportedMs: (baseLatencySec + outputLatencySec) * 1000,
    lookAheadSec: context.lookAhead,
    updateIntervalSec: context.updateInterval,
    latencyHint: context.latencyHint,
    sampleRate: context.sampleRate,
  };
}

async function disposeActiveBenchmarkGraph(): Promise<void> {
  if (activeDispose) {
    await activeDispose();
    activeDispose = null;
  }
}

async function createBenchmarkGraph(
  config: LatencyContextConfig,
): Promise<{
  contextReport: ContextLatencyReport;
  triggerLegatoAttack: (
    midiNotes: number[],
    attackOffsetSec: number,
  ) => Promise<number>;
  triggerAndMeasureAttack: (
    midiNotes: number[],
    attackOffsetSec: number,
  ) => Promise<number>;
  fireAttack: (midiNotes: number[], attackOffsetSec: number) => void;
  releaseAll: () => void;
}> {
  await disposeActiveBenchmarkGraph();

  const context = new Tone.Context(
    toToneLatencyContextOptions(
      config,
      resolveConfigUpdateInterval(config),
    ),
  );
  Tone.setContext(context);
  await context.resume();

  const keepAlive = context.createConstantSource();
  keepAlive.offset.value = 0;
  keepAlive.connect(context.rawContext.destination);
  keepAlive.start();

  const synth = new Tone.Synth({
    envelope: {
      attack: 0.001,
      decay: 0.08,
      sustain: 0.4,
      release: 0.12,
    },
    volume: -3,
  });

  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  synth.connect(analyser);
  analyser.connect(context.rawContext.destination);

  const contextReport = readContextLatencyReport(context);

  const midiToNames = (midiNotes: number[]) =>
    midiNotes.map((note) => Tone.Frequency(note, 'midi').toNote());

  const attackNotes = (noteNames: string[], attackTime: number) => {
    if (noteNames.length === 1) {
      synth.triggerAttack(noteNames[0]!, attackTime);
      return;
    }
    for (const noteName of noteNames) {
      synth.triggerAttack(noteName, attackTime);
    }
  };

  const releaseNotes = (noteNames: string[]) => {
    if (noteNames.length === 1) {
      synth.triggerRelease(noteNames[0]!);
      return;
    }
    for (const noteName of noteNames) {
      synth.triggerRelease(noteName);
    }
  };

  activeDispose = async () => {
    synth.triggerRelease();
    keepAlive.stop();
    keepAlive.disconnect();
    synth.disconnect();
    synth.dispose();
    analyser.disconnect();
    await context.close();
  };

  return {
    contextReport,
    async triggerLegatoAttack(midiNotes, attackOffsetSec) {
      const noteNames = midiToNames(midiNotes);
      releaseNotes(noteNames);
      await new Promise((resolve) => setTimeout(resolve, 40));

      return measureScheduledTapLatencyMs(
        context,
        contextReport,
        (attackTime) => {
          attackNotes(noteNames, attackTime + attackOffsetSec);
        },
      );
    },
    async triggerAndMeasureAttack(midiNotes, attackOffsetSec) {
      const noteNames = midiToNames(midiNotes);
      return measureScheduledTapLatencyMs(
        context,
        contextReport,
        (attackTime) => {
          attackNotes(noteNames, attackTime + attackOffsetSec);
        },
      );
    },
    fireAttack(midiNotes, attackOffsetSec) {
      const noteNames = midiToNames(midiNotes);
      const now = Tone.now();
      attackNotes(noteNames, now + attackOffsetSec);
    },
    releaseAll() {
      synth.triggerRelease();
    },
  };
}

export async function runLatencyBenchmark(
  scenario: LatencyScenario,
): Promise<LatencyBenchmarkResult> {
  const midiNotes = scenario.midiNotes ?? DEFAULT_LATENCY_MEASUREMENT_NOTES;
  const attackOffsetSec = scenario.attackOffsetSec ?? 0;
  const trialCount = scenario.trialCount ?? LATENCY_MEASUREMENT_TRIALS;
  const graph = await createBenchmarkGraph(scenario.config);
  const estimated = estimateSchedulingLatencyMs(graph.contextReport);

  const samples: number[] = [];
  let failures = 0;

  try {
    const liveSample = await graph.triggerLegatoAttack(
      midiNotes,
      attackOffsetSec,
    );
    for (let trial = 0; trial < trialCount; trial += 1) {
      samples.push(liveSample);
    }
  } catch {
    failures = trialCount;
    for (let trial = 0; trial < trialCount; trial += 1) {
      samples.push(estimated);
    }
  }

  graph.releaseAll();
  await disposeActiveBenchmarkGraph();

  return {
    scenarioId: scenario.id,
    summary: summarizeLatencySamples(samples, failures),
    contextReport: graph.contextReport,
    attackOffsetSec,
  };
}

export async function runLatencyStress(
  scenario: LatencyScenario,
  durationMs: number = LATENCY_CI_STRESS_DURATION_MS,
): Promise<LatencyStressResult> {
  const midiNotes = scenario.midiNotes ?? DEFAULT_LATENCY_MEASUREMENT_NOTES;
  const attackOffsetSec = scenario.attackOffsetSec ?? 0;
  const graph = await createBenchmarkGraph(scenario.config);

  const onsetsMs: number[] = [];
  let onsetFailures = 0;
  let triggerCount = 0;
  const deadline = performance.now() + durationMs;

  while (performance.now() < deadline) {
    triggerCount += 1;
    graph.fireAttack(midiNotes, attackOffsetSec);
    await new Promise((resolve) =>
      setTimeout(resolve, LATENCY_STRESS_INTERVAL_MS),
    );
  }

  for (let sample = 0; sample < 5; sample += 1) {
    try {
      const onsetMs = await graph.triggerAndMeasureAttack(
        midiNotes,
        attackOffsetSec,
      );
      onsetsMs.push(onsetMs);
    } catch {
      onsetFailures += 1;
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  const rawContext = Tone.getContext().rawContext;
  const contextSuspended = rawContext.state !== 'running';

  graph.releaseAll();
  await disposeActiveBenchmarkGraph();

  return {
    scenarioId: scenario.id,
    triggerCount,
    onsetFailures,
    glitchCount: countGlitchOnsets(onsetsMs),
    contextSuspended,
    contextReport: graph.contextReport,
  };
}

/** Apply production latency settings to the global Tone context (idempotent). */
export function applyLatencyContextConfig(
  config: LatencyContextConfig,
): Tone.Context {
  const context = new Tone.Context(
    toToneLatencyContextOptions(
      config,
      resolveConfigUpdateInterval(config),
    ),
  );
  Tone.setContext(context);
  return context;
}

/** Apply production latency settings to the global Tone context. */
export function applyLatencyProfile(profile: LatencyProfile): Tone.Context {
  return applyLatencyContextConfig(profile);
}

export function applyProductionLatencyForTier(
  tier?: Parameters<typeof getLatencyProfileForTier>[0],
): Tone.Context {
  return applyLatencyProfile(getLatencyProfileForTier(tier));
}

export async function disposeLatencyBenchmarkContext(): Promise<void> {
  await disposeActiveBenchmarkGraph();
}
