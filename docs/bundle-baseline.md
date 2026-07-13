# Production bundle baseline

Run an analyzed build from the repository root:

```bash
npm run build:analyze
```

Open `dist/bundle-stats.html` for the treemap.

## Reference (pre vendor split, single index chunk)

| Asset | Minified | Gzip |
|-------|----------|------|
| `index-*.js` | ~598 kB | ~167 kB |
| `index-*.css` | ~44 kB | ~8 kB |
| `Midi-*.js` (lazy) | ~31 kB | ~9 kB |

After optimization, expect separate `react-vendor`, `tone-vendor`, and `app-core`
chunks under 500 kB each, plus lazy `SettingsModal` and tour UI chunks.

Tone.js remains in an eager vendor chunk (not deferred to splash tap).

## Reference (post vendor split + lazy UI, 2026-06)

| Asset | Minified | Gzip |
|-------|----------|------|
| `index-*.js` (app core) | ~102 kB | ~32 kB |
| `react-vendor-*.js` (eager) | ~190 kB | ~60 kB |
| `tone-vendor-*.js` (eager) | ~260 kB | ~64 kB |
| `SettingsModal-*.js` (lazy) | ~43 kB | ~12 kB |
| `TourOverlay-*.js` (lazy) | ~3 kB | ~1 kB |
| `FirstRunTourPrompt-*.js` (lazy) | ~1 kB | ~0.5 kB |
| `Midi-*.js` (lazy) | ~31 kB | ~9 kB |
| `index-*.css` | ~44 kB | ~8 kB |

No chunk exceeds Vite's 500 kB warning threshold.
