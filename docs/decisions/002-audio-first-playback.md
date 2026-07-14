# ADR-002: Dispatch audio before React state on chord taps

## Status

Accepted

## Date

2026-07-13

## Context

Chord-tap latency is a product priority. React `setState` for selected
chord, pitches, and overlays can delay audible onset if audio waits on
the render path. The app also uses no-tilt re-voice effects that can
re-enter playback after pointer commits unless carefully suppressed.

## Options Considered

### Option A: Commit React state first, then play
- Pros: UI identity always matches the next frame’s notes
- Cons: Extra work on the hot path; worse tap-to-sound latency

### Option B: Compute pitches, dispatch AudioEngine immediately, then commit React
- Pros: Realtime audio stays ahead of visuals; matches CONTRIBUTING hot
  path contract
- Cons: Requires refs mirroring hot state; re-voice suppress for pointer
  commits; harder to reason about mid-commit bugs

### Option C: Move playback off React into a worker / pure audio graph owner
- Pros: Fully isolate audio from UI scheduling
- Cons: Large rewrite; still needs UI sync for labels and diagram

## Decision

We choose **Option B**. Pipeline: resolve tilt and pitches →
`dispatchAudio` / `triggerAttack` → then React commit
(`usePlaybackCommit`). Empty (muted) voicings also go through
`commitPlayback` so mute and sound share one commit path.

Pointer commits arm `noTiltRevoiceSuppress` so ChordContext’s register
re-voice effect skips once. Control changes (octave, voicing, VL mode)
must still re-voice.

## Consequences

- Prefer refs for values read on the audio-before-state path
- Do not add significant work between pitch resolution and
  `triggerAttack`
- Orchestration tests (`ChordContext.revoice.test.tsx`) guard suppress
  stickiness
- Visual updates (labels) may defer via `queueMicrotask` /
  `startTransition` after audio
