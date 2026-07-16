# ADR-001: Separate session tilt from audio play style

## Status

Accepted

## Date

2026-07-13

## Context

Playback needs two orthogonal controls: whether device orientation drives
voicing, and how notes are sustained. Early docs and comments treated
`"tilt"` as a third `playStyle`, which conflicted with Click and Hold on
tilt sessions and with splash/session defaults for voice leading.

See also
[`docs/movements-not-chords-tilt.md`](../movements-not-chords-tilt.md).

## Options Considered

### Option A: Single `playStyle` enum including `tilt`
- Pros: One setting surface in UI and storage
- Cons: Cannot combine Click and Hold with device tilt; coupling voice
  anchors to sustain behavior; hard defaults for smooth vs smoothest

### Option B: Separate `tiltModeEnabled` and audio `playStyle`
- Pros: Orthogonal concerns; Click and Hold works in tilt mode; VL
  defaults can follow session (tilt → smooth, no-tilt → smoothest)
- Cons: Two booleans/enums for contributors to learn; splash must set
  both intentionally

### Option C: Derive tilt from layout tier only
- Pros: No splash choice
- Cons: Desktops and phones would lose intentional mode selection;
  tour/help need distinct step sets either way

## Decision

We choose **Option B**. Session tilt is `tiltModeEnabled` (splash or
desktop Start). Audio style is `playStyle`: `tap` | `tap_and_hold`.
Product code uses `usesDeviceTilt(tiltModeEnabled)` instead of comparing
`playStyle` to a legacy `"tilt"` value.

Anchors: tilt → contrary (bass can move with width); no-tilt → pivot
(position sets bass).

## Consequences

- Settings UI must not offer a third play style named Tilt
- Voice-leading reset is tilt-aware
- Tours keep separate tilt and no-tilt step sets
- README/CONTRIBUTING must keep session vs style language in sync
