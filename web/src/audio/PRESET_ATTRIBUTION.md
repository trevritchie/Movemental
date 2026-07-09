# Preset Attribution

The following instrument presets are vendored from the community
[Tonejs/Presets](https://github.com/Tonejs/Presets) repository:

- `SuperSaw.json`
- `ElectricCello.json`

The **Warm Pad** preset uses the application's original synthesis defaults.

**Grand Piano** uses the [Salamander Grand Piano](https://sfzinstruments.github.io/pianos/salamander/)
sample library (CC-BY 3.0, Alexander Holm). Files are vendored from the Tone.js
CDN mirror at `public/samples/salamander/` (same MP3s as
`https://tonejs.github.io/audio/salamander/`).

**All other sampled instruments** use [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)
(CC-BY 3.0), vendored under `public/samples/{instrument}/`.

Regenerate maps: `node scripts/generate-tonejs-instrument-maps.mjs`

Re-download samples: `node scripts/download-instrument-samples.mjs`

Source: https://github.com/Tonejs/Presets (archived community preset collection)
