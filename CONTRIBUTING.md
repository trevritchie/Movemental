# Contributing to Movemental Web

Conventions for this app (React, TypeScript, Vite, Tone.js). See
[`README.md`](README.md) for domain architecture and DSP details.

Bug reports and feature requests use the templates under
[Issues](https://github.com/trevritchie/Movemental/issues/new/choose). Pull
requests are pre-filled from
[`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).
Participation in this project is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md). To report a security issue, see
[`SECURITY.md`](SECURITY.md) rather than opening a public issue.

## Module layout

| Tier | Path | Role |
|------|------|------|
| Domain | `src/music/` | Chords, borrowing, voicing, labels, shared pitch/layout tokens |
| Audio | `src/audio/` | Tone.js engine and FX chain |
| State | `src/context/` | React providers (`ChordContext`, `TiltReadoutContext`) |
| Hooks | `src/hooks/` | Playback, tilt sensor, layout tier, borrowing memory |
| UI | `src/components/` | SVG diagram, controls, overlays |
| Utils | `src/utils/` | Small cross-cutting helpers (`clamp`) |
| Tests | Colocated `*.test.ts(x)` next to the module under test |

Add a short module header comment when the file's purpose is not obvious from
its name alone.

## Shared modules (cross-file)

Prefer these instead of duplicating logic in components or hooks:

| Module | Use for |
|--------|---------|
| `music/pitchClass.ts` | Pitch-class normalization, tonal-center relatives, chord root PC |
| `music/elementTokens.ts` | Parent-element CSS colors and mod-3 bucket styling |
| `music/diagramLayout.ts` | SVG viewBox dimensions and coordinate-to-pixel helpers |
| `music/playbackTiltResolution.ts` | Smooth/smoothest tilt rules shared by playback and labels |
| `music/voicingCache.ts` | Single-entry memo for tilt label readouts (~7 Hz) |
| `utils/clamp.ts` | Numeric clamp helper |

`diagramMetadata.ts` `GROUP_PALETTE` is chord-group HSL styling, separate from
`elementTokens.ts` parent-element colors.

## React context boundaries

**`ChordContext`** wires borrowing, playback state, FX settings, and diagram
selection. It intentionally excludes high-frequency tilt samples.

**`TiltReadoutContext`** carries `tiltStatus`, `tiltSample`, and
`requestTiltPermission`. Subscribe here only when rendering tilt-dependent UI
(`DiagramVoicingOverlay`, splash permission flow). Components that do not need
tilt (borrowing sliders, settings) should stay on `ChordContext` alone.

**`tiltModeEnabled`** is set once at splash (Tilt vs No Tilt / desktop Start).
Settings only switch audio `playStyle` (`drone` vs `click_and_hold`).

**`LayoutTierProvider`** (in `useLayoutTier.ts`) shares one resize /
`matchMedia` listener for phone vs desktop layout. Wrap the app root; use
`useLayoutTierContext()` instead of instantiating `useLayoutTier` per
component.

When adding context fields, group them by update frequency. Stable handler
references (`useCallback`) keep `useMemo` context values from invalidating on
every parent render.

## Playback hot path

Chord-tap latency matters. In `useChordPlayback.ts`:

1. Compute pitches and `playbackTilt` first.
2. Call `dispatchAudio` / `audioEngine.triggerAttack` immediately.
3. Batch React `setState` after audio dispatch.
4. Use `invalidateVoicingCacheForCommit` on commit (chord, borrowing, mode
   key) instead of clearing the voicing cache on every label update.

Do not run voicing-cache lookups on the audio dispatch path; playback calls
`computeTiltVoicedPitches` directly.

## Tests

- Place unit tests beside the module: `foo.test.ts` next to `foo.ts`.
- Component tests live next to the component or under `src/test/` for shared
  setup utilities.
- Run `npm test -- --run` before pushing; aim to keep the full suite green.

**Gain staging and preset loudness** (offline Playwright renders, per-preset
matching, adding instruments): see [`docs/gain-staging-tests.md`](docs/gain-staging-tests.md).

**Audio buffer latency** (live scheduling benchmarks, lookAhead tuning): see
[`docs/latency-tuning.md`](docs/latency-tuning.md).

```bash
npm run test:unit      # fast mocked suite (default)
npm run test:audio     # offline bus + live latency tests; Playwright Chromium
npm run measure:loudness
npm run measure:latency
```

## Verification

From the repository root:

```bash
npm run lint
npm test -- --run
npm run build
```

Manual smoke after context or playback changes: diagram tap (tilt and
smoothest), borrowing slider drag, settings FX, record/stop.

## Path alias

`@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).
Prefer `@/music/...` and `@/context/...` in new shared modules; migrate
existing relative imports only when touching a file for other reasons.
