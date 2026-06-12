# Movements, Not Chords: The Tilt Mechanic

This document explains how the smartphone tilting mechanic works in the Python
prototype ("Movements, Not Chords", or MNC) and specifies how it is adapted
into Movemental Web as a new play style. The Python source lives in
`Movements-Not-Chords/mnc.py`. The web adaptation lives in
`web/src/music/TiltVoicingEngine.ts` and `web/src/hooks/useDeviceTilt.ts`.

## 1. The idea in one paragraph

The performer holds a phone flat, like a tray of water. Tapping the screen
selects a chord. Tilting the phone changes how that chord is voiced: rolling
the phone sideways expands or shrinks the chord symmetrically around a central
"pivot" note (contrary motion: the bottom voice moves down while the top voice
moves up), and pitching the phone toward the chest cycles parallel inversions
(each voice moves up one chord tone on the ladder). The result is polyphonic
voice movement, in the spirit of Barry Harris's "movements, not chords",
playable by anyone who can tilt a phone.

## 2. Data structures in the Python version

### 2.1 Scales of chords (8-note scales)

The harmonic engine is built on 8-note "scales of chords" (mnc.py lines
40-56), each stored as a list of semitone offsets from a root. For example:

```python
MAJOR_SIXTH_DIMINISHED_SCALE = [0, 2, 4, 5, 7, 8, 9, 11]
```

That is a C major scale plus an added flat 6 (Ab). The defining property: the
EVEN scale degrees (indices 0, 2, 4, 6) spell the "on" chord (C E G A, a
Cmaj6), and the ODD degrees (indices 1, 3, 5, 7) spell the "off" chord
(D F Ab B, a diminished seventh). Alternating between them gives endless
resolution and tension. Thirteen such scales are defined: major sixth
diminished, minor sixth diminished, minor seventh diminished, and dominant
seventh diminished families, each with rotations starting from the third,
fifth, or seventh.

### 2.2 Global performance state

| Variable | Meaning |
|---|---|
| `scaleOfChords` | the active 8-note interval list |
| `scaleOfChordsRoot` | pitch class of the scale root |
| `pivotPitch` | the MIDI note around which contrary motion expands and shrinks (default `root + 60`) |
| `offChordLock` | when true, tilt snaps to odd (off-chord) degrees instead of even |
| `chordNumeral`, `alternate`, `dominant`, `familyUp/Down/Across` | the button-driven state machine that swaps `scaleOfChords` and its root |
| `accelerometerValues` | the latest `[x, y, z]` sample from TouchOSC |

The chord-numeral buttons (1 through 8) each set a scale, a root, and reset
the pivot to `root + 60`. Modifier buttons (Alt, Make Dominant, Family
Up/Down/Across) substitute related scales for richer harmony. None of that
state machine is ported to the web version; Movemental's own chord buttons
replace it (see section 5).

## 3. How the tilting works, step by step

### 3.1 Input: TouchOSC accelerometer messages

TouchOSC streams `/accxyz` OSC messages containing the gravity vector in g
units, roughly -1.0 to 1.0 per axis. With the phone held in portrait:

- `x` is the roll axis. Flat is about 0; pouring "water" off the LEFT edge of
  the phone drives x toward -1.
- `y` is the pitch axis. Flat is about 0; pouring toward your chest (lifting
  the camera end skyward) drives y toward -1.
- `z` is received but unused.

The handler just stores the sample (`parseAccelerometerData`). Nothing sounds
until a button is tapped: `handleTouchInput` reads the stored sample at tap
time, so tilting while holding does not re-voice the chord. One tap, one
voicing.

### 3.2 `mapAccelerometerToPitch(x, y, z)`: tilt to scale positions

Both axes are first clamped to the [-1, 0] half of their range (positive
values are zeroed; only leftward roll and chest-ward pitch are musically
active). Then JythonMusic's `mapValue` linearly maps and truncates to an
integer:

```python
xMapped = mapValue(x, -1.0, 0.1, 0, 9)   # flat (x=0) -> 8, full roll (x=-1) -> 0
yMapped = mapValue(y, -1.0, 0.0, 9, 0)   # flat (y=0) -> 0, full pitch (y=-1) -> 9
```

`xMapped` is then snapped to chord parity: with the on-chord lock, odd values
are bumped up to even; with the off-chord lock, even values are bumped to odd.
This guarantees the bottom note of the voicing is always a chord tone of the
locked chord. `yMapped` is NOT parity-snapped, so the pivot can land on any
scale degree.

Each index is converted to an absolute MIDI pitch by splitting it into an
octave and a scale degree (8 degrees per octave):

```python
octaveX = (xMapped // 8) + 4            # roll lives around octave 4
pitchX  = scaleOfChords[xMapped % 8] + scaleOfChordsRoot + (octaveX * 12)

octaveY = (yMapped // 8) + 5            # pitch tilt lives around octave 5
pitchY  = scaleOfChords[yMapped % 8] + scaleOfChordsRoot + (octaveY * 12)
```

So with the phone flat and the C major sixth diminished scale: `xMapped = 8`
gives `pitchX = 60` (the default pivot), and `yMapped = 0` gives
`pitchY = 60`. Both anchors sit on the pivot, and the result is a single note.

### 3.3 `obliqueMotion(pitchY)`: move the pivot

Oblique motion is simply `setPivotPitch(pitchY)`. Tilting toward the chest
raises the pivot from `root + 60` by up to 9 scale degrees (an octave plus a
step). Because the bottom anchor `pitchX` is computed independently from the
roll axis, raising the pivot stretches the voicing upward while the bottom
holds: oblique motion.

### 3.4 `contraryMotion(pitchX)`: build the voicing

This is the heart of the instrument. Given the bottom anchor (`contraryPitch`)
and the current pivot:

1. If `contraryPitch >= pivotPitch`, return just `[pivotPitch]`: a single
   note. This is the "phone flat" sound.
2. Otherwise compute the chord width, the number of notes in the take-skip
   chain from the bottom anchor upward:

   ```python
   chordWidth = 1 + ((pivotScaleDegree - inputScaleDegree) % 8) + (8 * octaveSpread)
   chordWidth = min(chordWidth, 9)   # cap at the double octave chord
   ```

   The width equals 1 plus the scale-degree distance from the input up to the
   pivot. The cap at 9 exists so that extreme oblique motion still produces a
   playable chord.
3. Fill the chord bottom-up, taking a note and skipping a note (stepping 2
   scale degrees at a time), for `chordWidth` notes. Because the chain steps 2
   degrees per note while the width grows 1 per degree of distance, the chain
   tops out at the mirror image of the input across the pivot. The pivot is
   the CENTER of the voicing, not the top. Rolling the phone moves the bottom
   down and the top up simultaneously: contrary motion.
4. Thin wide chords to keep at most 5 voices ("like how I play it on piano").
   With chain notes numbered 1 (bottom) to width (top), these notes are
   SKIPPED:

   | Width | Name | Skipped notes | Sounding voices |
   |---|---|---|---|
   | 1-4 | partial stack | none | 1-4 |
   | 5 | octave chord | 3 | 4 |
   | 6 | drop 2 | 2, 5 | 4 |
   | 7 | drop 3 | 3, 6 | 5 |
   | 8 | drop 2 and 4 | 2, 4, 7 | 5 |
   | 9 | double octave chord | 2, 3, 5, 8 | 5 |

Worked example, C major sixth diminished scale, on-chord lock, pivot at 60
(middle C), phone rolled fully left (`xMapped = 0`, so `pitchX = 48`):

- width: `1 + 0 + 8 * 1 = 9`, the double octave chord.
- chain: 48 (C), 52 (E), 55 (G), 57 (A), 60 (C), 64 (E), 67 (G), 69 (A), 72 (C).
- thinning skips notes 2, 3, 5, 8, leaving: C, A, E, G, C (48, 57, 64, 67, 72).

That is the classic Barry Harris double octave voicing. Intermediate roll
angles give widths 1, 3, 5, 7 (odd widths, because parity snapping keeps both
anchors on the same chord), so a smooth roll plays: single note, three-note
stack, octave chord, drop 3, double octave chord.

### 3.5 Playback

`playChord` stops all previous notes and attacks the new ones (MIDI noteOn,
no scheduled noteOff by default), so the chord drones until the next tap. A
global transpose is applied at the playback boundary.

## 4. Cross-check of the other sources

- `mnc_temp.py` is an older revision. Differences worth noting: its thinning
  rules kept at most 4 voices ("like how I play it on guitar": width 7 skipped
  2, 3, 5; width 8 skipped 2, 4, 5, 7; width 9 skipped 2, 3, 5, 7, 8), it did
  not reset the pivot when changing chord numerals, and it had a volume-decay
  timer instead of fixed note lengths. The canonical `mnc.py` switched to the
  5-voice piano thinning used here.
- `gui.py` and `visuals.py` are the desktop visualizer. The one reusable idea
  is `pitchToVisualSlot` (mnc.py lines 153-179): each sounding note maps to
  one of 17 vertical slots covering two octaves centered on the pivot (slot 9
  is the pivot), which makes contrary motion visually symmetric. Movemental's
  ClockFace already visualizes active pitches, so this is not ported, but the
  17-slot ladder is a good reference if a dedicated tilt visualization is ever
  wanted.

## 5. Adaptation to Movemental Web

### 5.1 No more on-chord and off-chord locks

A key simplification: in the Python version, the take-skip fill over the
8-note scale with a parity lock only ever sounds 4 pitch classes, either the
on chord (even degrees) or the off chord (odd degrees). The 8-note scale is
scaffolding for selecting one of two 4-note chords.

Movemental's button layout makes that scaffolding unnecessary:

- Tapping a child node such as Branch voices only Branch's 4 tones. That IS
  the old on-chord lock.
- Tapping Fire voices only Fire's 4 tones. That IS the old off-chord lock,
  because Fire is the opposite element of Branch (`ELEMENTAL_RELATIONSHIPS`
  in `web/src/music/config.ts`). Branch (C E G A) plus Fire (D F Ab B) is
  exactly the C major sixth diminished scale; the user reaches either half
  with its own button.
- Borrowing still applies first. With borrowing engaged on Branch, the cycle
  is a mix of Branch and Fire tones, something the Python version could not
  do per-voice.

So the web engine operates on a "tone cycle": the pitch classes of the
post-borrowing chord (usually 4), sorted ascending as semitone offsets from
the chord's root (`rootPositionIndex` anchors offset 0). One ladder step in
the web engine equals one chord tone, where the Python version stepped two
scale degrees; the resulting chains and thinning are identical.

Worked examples with tonal center C:

| Button | Tones | Cycle offsets from root | Implied 8-note scale (with its opposite) |
|---|---|---|---|
| Branch | C E G A | 0, 4, 7, 9 | C major sixth diminished |
| Trunk | C Eb G A | 0, 3, 7, 9 | C minor sixth diminished |
| Leaf | C E G Bb | 0, 4, 7, 10 | C dominant seventh diminished |
| Fire | D F Ab B | 0, 3, 6, 9 | the shared off chord of all three |

### 5.2 Reversed roll; parallel pitch; oblique width

The web version deliberately REVERSES the roll mapping relative to Python:

- Phone flat (natural face-up position): the WIDEST voicing, the double
  octave chord (9-note chain thinned to 5 voices).
- Phone rolled toward fully vertical: the single pivot note (Unison).

Roll expands the voicing in **oblique motion** from the parallel pivot: each
wider level adds one ladder tone, alternating above and below the anchor
(width 2 adds above, width 3 adds below, and so on). Nine evenly spaced roll
levels reach every named voicing shape:

Unison, Third, Triad, Close, Octave, Drop 2, Drop 3, Drop 2 and 4, Double
Octave.

The pitch axis uses **parallel motion**. Flat selects root position (parallel
level 0). Tilting toward the chest (camera toward the sky) steps through four
inversion levels (0 through 3 on a 4-tone cycle). Each level rotates every
voice up one chord tone on the tone ladder (C E G A becomes E G A C, then G A
C E, then A C E G).

Roll and pitch compose: at parallel level 2, rolling still sweeps through all
nine oblique widths anchored on the second-inversion bass.

### 5.3 Engine math (TiltVoicingEngine)

Inputs are a normalized tilt sample with both axes in [-1, 0] (0 = flat) and
the tone cycle. All positions are integer steps on the chord-tone ladder,
with the home register anchored at the chord root (`homeMidi =
rootPitchClass + 12 * (octaveRange + 2)`, which is C5-ish at the default
octave range of 3, placing the double octave chord in the app's normal
sounding register):

```text
inputSteps    = round(map(x, -1..0  ->  0..8))     # flat -> widest oblique
width         = inputSteps + 1                    # 1..9 voicing levels
parallelSteps = round(map(|y|, 0..1  ->  0..3))   # flat -> root inversion
pivot         = min(parallelSteps, cycle.length - 1)
bottom        = pivot - floor((width - 1) / 2)
chain         = cycle tones from bottom, ascending, width notes
voicing       = thin(chain)                       # same table as section 3.4
```

Width 1 returns only the pivot note. Odd widths are symmetric around the
pivot; even widths extend farther above than below (or vice versa on the
first step). Wide voicings use the existing thinning table from section 3.4.

### 5.4 Sensors: from OSC to browser APIs

No third-party package is needed; the browser provides the sensors natively.

| TouchOSC `/accxyz` | Browser equivalent |
|---|---|
| gravity vector, g units, -1..1 | `devicemotion` event, `accelerationIncludingGravity`, m/s^2 (divide by 9.81); or `deviceorientation` angles |
| x -> -1 rolling left | `gamma` (deg, -90..90) goes negative rolling left; `accelerationIncludingGravity.x` goes positive |
| y -> -1 pitching toward chest | `beta` (deg) goes positive lifting the top edge; `accelerationIncludingGravity.y` goes positive |

The implementation (`useDeviceTilt`) uses `deviceorientation` angles as the
primary source because they are consistent across browsers, while iOS has a
well-known sign quirk in its `devicemotion` acceleration values. Mapping:

```text
x = -clamp(|gamma| / 90, 0, 1)    # roll magnitude, so either roll direction narrows the chord
y = -clamp(beta / 90, 0, 1)       # chest-ward pitch selects parallel inversion level
```

Using the roll magnitude is a small ergonomic upgrade over Python (which only
responded to leftward roll): either direction of roll narrows the voicing.

Platform requirements:

- iOS 13+ requires `DeviceOrientationEvent.requestPermission()`, which must
  be called from a user gesture (a button tap) and only resolves on HTTPS.
- Android Chrome fires the events without a permission prompt, HTTPS only.
- Desktop browsers generally have no sensors; the tilt sample stays at flat,
  so the tilt style still plays (always the widest voicing).

### 5.5 Trigger model

Same as the Python version, layered onto Movemental's drone style:

1. The chord drones indefinitely (legato note diffing in `AudioEngine`).
2. Tilt is sampled continuously but applied only at tap time: each tap of a
   chord button reads the latest tilt and re-voices the drone.
3. Borrowing or settings changes re-voice with the latest tilt as well.

Future experiments (out of scope for the first version): re-voicing
continuously while held, or a free-drone mode where tilt alone re-voices.

### 5.6 Integration map

| Piece | File |
|---|---|
| Voicing engine (pure functions) | `web/src/music/TiltVoicingEngine.ts` |
| Pre-voicing borrowed pitch structure | `web/src/music/BorrowingLogic.ts` (`generatePitchStructure`) |
| Sensor hook with permission flow | `web/src/hooks/useDeviceTilt.ts` |
| New play style `tilt` | `web/src/context/types.ts` |
| Tap-time voicing branch | `web/src/hooks/useChordPlayback.ts` |
| Context wiring | `web/src/context/ChordContext.tsx` |
| Style selector and Enable Motion UI | `web/src/components/TopBar.tsx` |
| Unit tests | `web/src/test/TiltVoicingEngine.test.ts` |
