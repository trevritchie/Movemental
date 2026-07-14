# ADR-004: Domain, diagram, styles, and session type tiers

## Status

Accepted

## Date

2026-07-13

## Context

CONTRIBUTING described `src/music/` as chords, borrowing, voicing, and
labels, but SVG geometry and a mega `index.css` lived without clear
owners. Product enums (`PlayStyle`, `VoiceLeadingMode`) lived under React
`context/types`, so pure music modules depended on the state tier.

## Options Considered

### Option A: Keep geometry and styles colocated with historical homes
- Pros: No import churn
- Cons: Domain review includes layout/CSS; wrong dependency direction
  (music → context)

### Option B: Explicit tiers under `src/`
- Pros: Matches CONTRIBUTING; music stays harmonic; styles/geometry have
  edit boundaries
- Cons: Moves many files once; docs must stay updated

### Option C: Feature folders (diagram feature owns music + CSS + hooks)
- Pros: Vertical slices for some features
- Cons: Heavy restructure for a small SPA; fights shared chord manager
  and audio engine

## Decision

We choose **Option B**:

| Tier | Path | Owns |
|------|------|------|
| Domain | `src/music/` | Chords, VL, labels, `sessionModes`, group metadata |
| Diagram | `src/diagram/` | SVG scaling, node geometry, shell/overlay metrics |
| Styles | `src/styles/` | Global CSS by surface; `index.css` is import shell |
| State | `src/context/` | Providers; re-exports session types for UI convenience |

Session enums and helpers live in `music/sessionModes.ts`. Context keeps
thin re-exports only.

Frequency splits inside providers remain: `SoundDesignContext` and
`TiltReadoutContext` stay separate from the wide `ChordContext` surface.
Settings reset wiring lives in `useSettingsReset`, not the chord kernel
body.

## Consequences

- New diagram layout math goes under `src/diagram/`, not `src/music/`
- New global CSS goes in the matching `src/styles/*.css` surface
- Music must not import React context modules for product types
- Layout breakpoints comments sync with `src/styles/`, not a single
  megasheet
