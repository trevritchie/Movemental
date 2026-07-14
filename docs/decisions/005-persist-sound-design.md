# ADR-005: Persist sound design in validated user settings

## Status

Accepted

## Date

2026-07-13

## Context

Users expect instrument, EQ, FX wet levels, and envelopes to survive a
refresh. An older shim (`audioSettingsStorage`) and README claimed session-
only EQ/preset while `userSettingsSchema` already persisted `soundDesign`
through `usePersistedUserSettings`. Dead no-op writers invited a second
persistence path.

## Options Considered

### Option A: Keep sound design session-only
- Pros: Simpler first-run; no preset hydrate surprises
- Cons: Conflicts with current schema/tests; worse returning-user UX

### Option B: Persist under unified user settings with validation
- Pros: One storage story; schema validates before apply; section/group
  resets already exist
- Cons: Must version carefully on semantic renames; splash “first visit”
  uses `hasPersistedSettings` as a coarse gate

### Option C: Separate `localStorage` keys per FX control
- Pros: Incremental migration from legacy keys
- Cons: Divergent formats; hard to reset coherently

## Decision

We choose **Option B**. Sound design keys live in the `soundDesign`
section of user settings. First-visit EQ default still uses layout-tier
`resolveDefaultEqProfileId` when nothing is persisted. Remove or avoid
no-op storage shims that claim a different contract.

## Consequences

- README must document persistence, not session-only
- Instrument/EQ hydrate is covered by ChordProvider persistence tests
- Schema versioning today is field recovery (`version: 1`); semantic
  renames will need a real migration story later
- Returning users skip splash forcing of VL/playStyle when any settings
  blob exists (`hasPersistedSettings`)
