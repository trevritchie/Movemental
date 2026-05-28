# Movemental

Interactive chord exploration through the Elemental Tesseract harmonic system (Earth, Wind, Fire).

## Repository layout

| Directory | Role |
|-----------|------|
| [`web/`](web/) | **Active product** — React, TypeScript, Vite, Tone.js. Deploy output: `web/dist` (Firebase Hosting). |
| [`python/`](python/) | **Archived prototype** — CreativePython / PySide desktop app kept for reference. |

## Quick start (web)

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Verify and build

```bash
cd web
npm run lint
npm test --run
npm run build
npm run preview   # optional: serve production build locally
```

### Deploy (Firebase Hosting)

| Environment | Project | How it deploys |
|-------------|---------|----------------|
| Dev | `movemental-dev` | `npm run build` locally (build + deploy; skipped when `CI=true`) |
| Prod | `movemental-chords` | Push to `main` with changes under `web/` (GitHub Actions after verify) |

**Local (dev):** Run `firebase login` once in `web/`, then `npm run build` deploys to dev.

**CI (prod):** Add a repository secret `FIREBASE_TOKEN` from `npx firebase login:ci` (account needs Hosting deploy access on both projects).

See [`web/README.md`](web/README.md) for architecture, audio chain, and domain logic.

## Python prototype

The legacy app lives under `python/`. See [`python/README.md`](python/README.md) for setup if you need to run it locally.
