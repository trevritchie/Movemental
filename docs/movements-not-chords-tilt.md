# Movements, not chords (tilt contract)

Port of the tilt-to-counterpoint mechanic from the archived Python prototype
(`Movements-Not-Chords/mnc.py`). Runtime code lives in
[`TiltVoicingEngine.ts`](../src/music/TiltVoicingEngine.ts),
[`useDeviceTilt.ts`](../src/hooks/useDeviceTilt.ts), and the playback
orchestrator [`useChordPlayback.ts`](../src/hooks/useChordPlayback.ts).

This document is the canonical home for coordinate mapping and sampling
rules. Product prefs that mention tilt should link here rather than restate
the math.

## Session modes vs audio play style

**`tiltModeEnabled`** is chosen once at splash (Tilt vs No Tilt, or desktop
Start for no-tilt). It selects the voicing **anchor**:

| Mode | Anchor | Bass behavior |
|------|--------|---------------|
| Tilt (`tiltModeEnabled`) | `contrary` | Roll can move the bass as width changes |
| No tilt | `pivot` | Position sets bass; width only adds voices above |

**`playStyle`** is audio-only: `drone` or `click_and_hold`. It is not a third
tilt mode. Click and Hold works with device tilt enabled. Prefer
`usesDeviceTilt(tiltModeEnabled)` over comparing `playStyle` to a legacy
`"tilt"` value.

Defaults: tilt session → smooth voice leading; no-tilt splash / desktop Start
→ smoothest.

## Device coordinate mapping

`deviceorientation` angles are normalized by
`ORIENTATION_ANGLE_NORMALIZER` (90°) in [`orientationUtils.ts`](../src/hooks/orientationUtils.ts).

Normalized `TiltSample`:

| Field | Axis | Range | Meaning |
|-------|------|-------|---------|
| `x` | Roll (gamma) | `[-1, 0]` | `0` = phone flat; `-1` = fully vertical |
| `y` | Pitch (beta) | `[-1, 1]` | `-1` = chest-ward; `+1` = away-from-chest; `0` = flat |

Large Euler wrap jumps are rejected via `isOrientationContinuous` so
singularities at ±90° roll do not flip the sample.

## Sampling rules (tap-time, not continuous audio)

Voicing is **sampled at chord tap / settings change**, not continuously while
the phone moves under a held chord.

- **Playback:** uses the **raw** orientation sample at tap time
- **UI overlay (~7 Hz):** uses a **smoothed** sample (~150 ms) via
  `TiltReadoutContext` so borrowing controls are not blasted by sensor noise

Glowing orbs in tilt mode use an inverted bubble-level mapping tied to the
same pitch/roll range (`orbPhysics.ts`), not gravity rolling of free bodies.

## Tone cycle and ladder

Each chord is voiced on a **tone cycle**: post-borrowing pitch classes as
ascending semitone offsets from the chord root. One ladder step equals one
chord tone.

**Roll** drives oblique width (nine levels). Response is reversed from the
Python prototype:

- Flat → widest (Double Octave, thinned to five voices)
- Vertical → unison on the pivot

**Pitch** drives parallel positions on the ladder. Static no-tilt UI encodes
chest-ward positions 1st through 4th; full device tilt also supports
away-from-chest registers (±4 ladder steps at extreme pitch).

Voicing level names: Unison, Third, Triad, Close, Octave, Drop 2, Drop 3,
Drop 2 and 4, Double Octave.

## Elemental and opposite-element rules

Earth, Wind, and Fire use diminished spellings with contrary-motion
anchoring. Playback stores the last **resolved** elemental chord so chains
stay coherent.

Opposite-element navigation preserves committed parallel plus pitch delta and
searches diminished rotations so the sounded bass lands one or two semitones
below the previous chord. Elemental resolution runs **after** `playbackTilt`
is finalized in `useChordPlayback`.

Wind flat default is 5th in bass (parallel -2). Earth–Wind or Wind–Fire axis
entry to Wind uses 6th in bass (parallel -1). See AGENTS.md and
[`elementalRoot.ts`](../src/music/elementalRoot.ts) for the full matrix.

## Related modules

- [`tiltVoicingPlayback.ts`](../src/music/tiltVoicingPlayback.ts): borrowing +
  elemental + engine (shared by audio and labels)
- [`playbackTiltResolution.ts`](../src/music/playbackTiltResolution.ts):
  smooth / smoothest / opposite-element tilt resolution
- [`voiceDegreeLabel.ts`](../src/music/voiceDegreeLabel.ts): IN THE BASS from
  sounded pitches when available
