# Audio latency tuning

Live tap-to-sound latency is dominated by Tone.js `lookAhead` (scheduling horizon)
plus the browser-reported `baseLatency` and `outputLatency`. The voicing hot path
already dispatches audio before React state updates; this doc covers buffer and
scheduling tuning only.

## Current latency budget

| Source | Before tuning | After tuning (desktop) |
|--------|---------------|-------------------------|
| Tone.js `lookAhead` | 100 ms (default) | **0 ms (experimental)** |
| Tone.js `updateInterval` | 50 ms (default) | 10 ms (floor when lookAhead is 0) |
| `latencyHint` | `interactive` | `interactive` |
| Browser reported HW latency | ~10 ms (Chromium desktop) | ~10 ms |
| **Estimated scheduling latency** | **~110 ms** | **~10 ms** |
| `ATTACK_SCHEDULE_OFFSET` (retrigger/preview only) | 15 ms | 5 ms |
| Legato diagram path | schedules at `Tone.now()` | unchanged |

All tiers currently use `lookAhead: 0` (~10 ms estimated on desktop Chromium).
This is an experiment; bump in `latencyProfile.ts` if glitches appear under fast
tapping.

Constants live in [`latencyProfile.ts`](../src/audio/latencyProfile.ts) and are
applied once in [`AudioEngine.startContext()`](../src/audio/AudioEngine.ts).

## Metrics

| Metric | Meaning |
|--------|---------|
| `tapToOnsetMs` (median / p95) | Wall-clock delay from trigger to scheduled attack time plus `outputLatency` |
| `contextReport.totalReportedMs` | `baseLatency + outputLatency` from the AudioContext |
| Stress `contextSuspended` | AudioContext dropped out of `running` during rapid 8 Hz firing |
| Stress `glitchCount` | Post-stress onset jitter outliers |

Pass targets:

- Production desktop median and p95 <= 40 ms
- Stress: context stays running; onset failures = 0

## Running measurements

```bash
npm run measure:latency
npm run measure:latency -- --sweep
npm run measure:latency -- --stress
npm run measure:latency -- --stress --full-stress
npm run measure:latency -- --write-baseline
```

Default scripted runs use short timeouts (5 s stress, 15 s per scenario, 30 s harness
load). Pass `--full-stress` for the 30 s manual stress pass.

`--sweep` runs the full lookAhead / latencyHint matrix from
[`latencyScenarios.ts`](../src/audio/latencyScenarios.ts).

Automated benchmarks use audio-clock scheduling latency (reliable in headless
Chromium). Optional meter-based onset detection is available for headed manual
runs.

## Regression tests

```bash
npm run test:unit          # latencyAnalysis + latencyProfile math
npm run test:audio         # includes latency.live.test.ts (real AudioContext)
```

Baseline medians are stored in
[`latency.baseline.json`](../src/audio/latency.baseline.json).

## Sweep results (Chromium desktop, Jun 2026)

| lookAhead | Estimated median |
|-----------|------------------|
| 0.10 (Tone default) | 110 ms |
| 0.05 | 60 ms |
| 0.03 | 40 ms |
| **0.02 (desktop production)** | **30 ms** |
| 0.01 | 20 ms |
| 0 | 10 ms |

`latencyHint` variants at `lookAhead 0.02` were within 10 ms of each other
except numeric `0.02` (40 ms total reported HW latency).

Stress at `lookAhead 0.02`: no context suspension at 4x or 6x CPU throttle;
minor onset jitter under throttle (1 to 2 samples).

## Manual device checklist

After changing latency constants, verify on real hardware:

1. **Desktop (Chrome / Brave)**  
   Open Settings, play rapid chord taps in Click and Hold. Attacks should feel
   immediate with no clicks on legato changes.

2. **iPhone (Safari)**  
   Confirm splash `startContext` still unlocks audio via
   [`iosMediaChannel.ts`](../src/audio/iosMediaChannel.ts). If glitches appear
   under fast tapping, bump phone `lookAhead` in `latencyProfile.ts` by 0.01.

3. **Android (Chrome)**  
   Same rapid-tap test. Watch for underruns or stuck notes.

4. **Tilt retrigger path**  
   Enable Tilt mode and tap the same chord repeatedly. If release/attack clicks
   appear, increase `ATTACK_SCHEDULE_OFFSET_SEC` in `busConstants.ts` slightly.

Record subjective notes and measured `contextReport` from the dev console log on
first `startContext`.

## Changing latency constants

Edit [`latencyProfile.ts`](../src/audio/latencyProfile.ts), then:

```bash
npm run measure:latency -- --sweep
npm run test:audio
npm run measure:latency -- --write-baseline
```

Do not set `lookAhead` below 0.01 without re-running stress at 6x throttle.
