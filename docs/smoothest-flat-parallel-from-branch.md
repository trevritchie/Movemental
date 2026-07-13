# Smoothest flat parallel from Branch

Parallel ladder steps Smoothest mode picks when you hold Branch at
flat double octave, then tap each chord. These values seed Smooth mode
defaults in `predeterminedVoiceLeading.ts` unless noted below.

Settings: tonal center Bb, home octave 2, contrary tilt anchor.

To change Smooth mode defaults, edit `CHORD_FLAT_PARALLEL` in
`src/music/predeterminedVoiceLeading.ts`. Re-run the vitest
`writes smoothest-from-branch table markdown for review` test in
`smoothestParallelFromBranch.test.ts` to regenerate this file.

### Elemental

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Earth | -2 | 5th |
| Wind | -1 | 6th |
| Fire | 0 | Root |

### Earth-Wind, Trunk

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Trunk | 0 | Root |
| Sister Trunk | -3 | 3rd |
| Twin Trunk | -2 | 5th |
| Brother Trunk | -1 | 6th |

### Earth-Wind, Branch

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Branch | 0 | Root |
| Sister Branch | -3 | 3rd |
| Twin Branch | -2 | 5th |
| Brother Branch | -1 | 6th |

### Earth-Wind, Sand-Storm

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Sand-Storm | 0 | Root |
| Sister Sand-Storm | -3 | 3rd |
| Twin Sand-Storm | -2 | 5th |
| Brother Sand-Storm | -1 | 7th |

### Earth-Wind, Leaf

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Leaf | 0 | Root |
| Sister Leaf | -3 | 3rd |
| Twin Leaf | -2 | 5th |
| Brother Leaf | -1 | 7th |

### Wind-Fire, Smoke

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Smoke | -2 | 5th |
| Sister Smoke | -1 | 6th |
| Twin Smoke | 0 | Root |
| Brother Smoke | -3 | 3rd |

### Wind-Fire, Ember

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Ember | -2 | 5th |
| Sister Ember | -1 | 6th |
| Twin Ember | 0 | Root |
| Brother Ember | -3 | 3rd |

### Wind-Fire, Fire-Storm

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Fire-Storm | -2 | 5th |
| Sister Fire-Storm | -1 | 7th |
| Twin Fire-Storm | 0 | Root |
| Brother Fire-Storm | -3 | 3rd |

### Wind-Fire, Flame

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Flame | -2 | 5th |
| Sister Flame | -1 | 7th |
| Twin Flame | 0 | Root |
| Brother Flame | -3 | 3rd |

### Fire-Earth, Magma

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Magma | -1 | 6th |
| Sister Magma | -4 | Root |
| Twin Magma | -3 | 3rd |
| Brother Magma | -2 | 5th |

### Fire-Earth, Glass

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Glass | -2 | 5th |
| Sister Glass | -1 | 6th |
| Twin Glass | -4 | Root |
| Brother Glass | -3 | 3rd |

### Fire-Earth, Forest-Fire

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Forest-Fire | -2 | 5th |
| Sister Forest-Fire | -1 | 7th |
| Twin Forest-Fire | -4 | Root |
| Brother Forest-Fire | -3 | 3rd |

### Fire-Earth, Charcoal

| Chord | Parallel steps | Bass degree at flat |
|-------|----------------|---------------------|
| Charcoal | -2 | 5th |
| Sister Charcoal | -1 | 7th |
| Twin Charcoal | -4 | Root |
| Brother Charcoal | -3 | 3rd |

## Smooth mode: Wind

Smoothest from Branch gives Wind parallel **-1** (6th in bass). Smooth
overrides the Wind table entry to **-2** (5th in bass at flat tilt).

When navigating **to Wind** in smooth tilt mode (see
`playbackTiltResolution.ts` and `elementalRoot.ts`):

| Previous context | Entry parallel | Bass at flat (no pitch delta) |
|------------------|----------------|-----------------------------|
| Earth-Wind or Wind-Fire edge, not opposite | -1 | 6th |
| Fire corner or other non-opposite | -2 | 5th |
| Fire-Earth edge (opposite-element) | preserve committed parallel from source + pitch delta; rotation search | depends on source |

Pitch tilt since the last diagram tap adds to the entry baseline. Roll
comes from live device tilt.
