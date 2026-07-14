# ADR-003: Three voice-leading modes with one re-anchor entry

## Status

Accepted

## Date

2026-07-13

## Context

The product exposes three voice-leading behaviors (root position, smooth
predetermined table, smoothest live min-motion) plus opposite-element and
Wind-entry specialty rules. Multiple `resolve*` helpers grew across
modules; hooks branched on mode next to those helpers, which made new
rules land in `voiceAndPlay` first and risked label/playback divergence.

## Options Considered

### Option A: Keep mode `if/else` in `useChordPlayback` only
- Pros: Local to the orchestrator; fewer files
- Cons: Mode vocabulary and specialty rules keep growing in one callback

### Option B: Single policy dispatcher; engines stay specialized
- Pros: One playback re-anchor entry; math stays in predetermined /
  smoothest / elemental / `playbackTiltResolution`
- Cons: Another module to learn; wrappers must not become pass-through fog

### Option C: Collapse all three modes into one heuristic
- Pros: Simpler UI and code
- Cons: Breaks product differentiation (table vs min-motion vs root) and
  documented session defaults

## Decision

We choose **Option B**. Modes remain:

| Mode | Role |
|------|------|
| `root_position` | Flat parallel baseline from control tilt |
| `smooth` | `CHORD_FLAT_PARALLEL` table + navigation rules |
| `smoothest` | Live minimum-motion search |

Playback hooks call
[`voiceLeadingPolicy.resolveReanchorPlaybackTilt`](../../src/music/voiceLeadingPolicy.ts).
Bass labels use sounded pitches when available; live tilt preview may omit
`activePitches` so orientation can update via effective-tilt rules.

## Consequences

- New re-anchor rules should extend the policy or its engines, not add a
  parallel `resolveXForY` used only by one hook
- Do not put leading-tone special cases into smoothest without product
  intent (AGENTS: pure minimum-motion)
- Opposite-element / Wind baselines stay in elemental + smooth navigation
  helpers, invoked after tilt is finalized
