# Movemental Interactive Tour and Help Menu Copy Review

This document audits each step of the interactive product tour in both Tilt and No-Tilt modes, explains the underlying feature mechanics, compares previous copy with your edits, and presents the latest proposed copy incorporating your feedback.

---

## Tour Architecture and Layout Rules

The tour is configured in `src/tour/tourSteps.ts` and delivered via `src/components/tour/TourOverlay.tsx`.

1. **Tilt Mode (Mobile Sensor Sessions):**
   - Covers diagram, voicing (contrary motion), bass (parallel motion), voice borrowing, clock face overlay, chord naming system, settings, session recording, and panic.
2. **No-Tilt Mode (Desktop / Manual Mobile):**
   - Covers diagram, voicing elevator (oblique motion), bass selection, voice borrowing, clock face diagram, chord naming system, settings, session recording, and panic.
3. **Layout Separation:**
   - **Clock Face Diagram:** Mobile displays the clock as an interactive on-screen overlay; desktop displays it in the unified side panel.
   - **Chord Naming System:** Mobile displays the four-level readout in the bottom-left corner overlay; desktop displays it in the side panel above the clock dial.
4. **Automated Quality Checks:** Tests in `src/tour/tourSteps.test.ts` assert that:
   - Voice borrowing copy references `neighbor` and `Borrowing from the Neighbors`.
   - Voicing copy references `elevator floors` (Tilt) and `elevator floor` (No-Tilt).
   - All DOM targets (`data-tour-id`) exist and resolve properly.

---

## Review of Your Edits to `docs/tour-copy-review.md`

1. **Step 1 (Elemental Diagram):**
   - Added `(created by combining notes from two parents)` to the child families description. This directly connects the diagram layout to Barry Harris's Creation Theory, showing that child chords inherit DNA from adjacent diminished parents.
   - Streamlined child family examples from "Foliage, Branch, Trunk, Root" to "Branch, Trunk, Root".
2. **Step 2 (VOICING - Tilt Roll):**
   - Replaced technical angle descriptions with concrete physical orientations: `(full tilt)` for Unison and `(parallel to ground)` for Double Octave.
   - Added the piano hand movement metaphor: `"contrary motion": imagine your hands moving further or closer together on a piano`. This makes the concept immediately intuitive.
3. **Step 2 (Voicing Elevator - No-Tilt):**
   - Standardized terminology to "oblique motion".
4. **Step 3 (IN THE BASS - Tilt Pitch):**
   - Added the complementary piano metaphor: `"parallel motion": imagine your hands moving together up or down a piano`.
5. **Step 4 (Voice Borrowing):**
   - Changed "pure, natural chord tone" to "chord tone", and "for open or sparse voicings" to practical musician language: "for smaller voicings such as triads".
6. **Step 5 (Clock Face Diagram):**
   - Changed title from "Chromatic Clock Face" to "Clock Face Diagram", accommodating both Chromatic and Circle of Fifths layouts.
   - Extended applicability to mobile as well as desktop.
   - Corrected element color descriptions to Earth green, Wind blue, Fire red.
7. **Step 6 (Settings):**
   - Simplified title from "Settings and Sound Design" back to "Settings".
8. **Step 7 (Session Recording):**
   - Refined underlying feature text to emphasize graceful fade-out and export choices.
9. **Step 8 (Panic Switch):**
   - Simplified copy to: `Silences all sounding audio. Stopping a recording session also engages this switch automatically.`

---

## Step-by-Step Feature Review and Updated Copy

### Step 1: Elemental Diagram

* **Target ID:** `tour-diagram`
* **Applicable Sessions:** Tilt and No-Tilt (Phone and Desktop)
* **Underlying Feature:** The elemental triangle represents Movemental's harmonic universe. At the three vertices sit the three diminished parent structures: Earth (top-left), Wind (top-right), and Fire (bottom). Between every pair of parents on the axes are child chord families (such as Branch, Trunk, Root) created by combining notes from two parents. Each circle family contains four sibling slices (Base, Brother, Twin, Sister) based on Barry Harris's Creation Theory. Tapping any chord plays it immediately; dragging across slices transitions between siblings with smooth voice leading.
* **Help Menu Link:** Help Hub > "Elemental Diagram", and Harmonic Theory > "Creation Theory".

##### Updated Copy
* **Title:** Elemental Diagram
* **Body:**
  > **Earth**, **Wind**, and **Fire** are diminished parent vertices at the triangle corners.
  >
  > **Child families** (created by combining notes from two parents) sit along each axis, each divided into four sibling slices: **Base**, **Brother**, **Twin**, and **Sister**.
  >
  > Tap any chord to play it, or **drag across slices** for smooth voice-led transitions.

***

### Step 2 (Tilt Session): VOICING (Tilt Roll)

* **Target ID:** `tour-voicing`
* **Applicable Sessions:** Tilt mode only (Phone with motion sensors)
* **Underlying Feature:** Device roll (tilting the phone left or right along its long axis) controls chord width across nine "elevator floors" (Unison, Third, Triad, Close, Octave, Drop 2, Drop 3, Drop 2 and 4, Double Octave). When the phone is parallel to the ground, voicing is at its widest (Double Octave); when at full tilt, it collapses to Unison. Tilt mode uses contrary motion (notes expand symmetrically around the pivot).
  - When **Tilt to Strum** is On: The single readout displays your live active floor.
  - When **Tilt to Strum** is Off: The stack displays two values: the top grey value is what sounded last, while the lower value is what you will hear if you tap a chord now.
* **Help Menu Link:** Help Hub > "VOICING and IN THE BASS", and Harmonic Theory > "Elevator System".

#### Updated Copy
* **Title:** VOICING (Tilt Roll)
* **Body:**
  > Tilt your phone **left or right (roll)** to step through nine **elevator floors**, from narrow **Unison** (full tilt) to wide **Double Octave** (flat).
  >
  > This enables **contrary motion**: imagine your hands moving closer together or further apart on a piano.
  >
  > *(With Tilt to Strum On)*: The readout shows your active floor.
  > *(With Tilt to Strum Off)*: The top value is what sounded last, while the lower value is what you will hear if you tap a chord now.

***

### Step 2 (No-Tilt Session): Voicing Elevator

* **Target ID:** `tour-voicing`
* **Applicable Sessions:** No-Tilt mode (Desktop or Phone without motion sensors)
* **Underlying Feature:** The VOICING pill opens a selector for the nine elevator floors. In No-Tilt mode, voicing uses oblique motion: the bottom note stays anchored while additional chord tones are stacked above it. Beside the selector, a lock button allows pinning a specific voicing floor to the active chord so that navigating away and returning restores your choice.
* **Help Menu Link:** Help Hub > "VOICING and IN THE BASS", and Harmonic Theory > "Elevator System".

#### Updated Copy
* **Title:** Voicing
* **Body:**
  > Choose an **elevator floor** from the **VOICING** pill to shape chord width, from narrow **Unison** to wide **Double Octave**.
  >
  > In No-Tilt mode, width expands upward from the bass.
  >
  > Tap the **lock icon** to save your voicing floor specifically for this chord.

***

### Step 3 (Tilt Session): IN THE BASS (Tilt Pitch)

* **Target ID:** `tour-bass`
* **Applicable Sessions:** Tilt mode only (Phone with motion sensors)
* **Underlying Feature:** Device pitch (tilting forward away from chest or backward toward chest) shifts the register ladder and selects the parallel position (which chord degree occupies the lowest voice: Root, 3rd, 5th, or 6th/7th). This enables parallel motion (shifting registers up and down).
  - When **Tilt to Strum** is On: The single readout displays your live active bass note.
  - When **Tilt to Strum** is Off: The stack displays two values: the top grey value is what sounded last, while the lower value is what you will hear if you tap a chord now.
* **Help Menu Link:** Help Hub > "VOICING and IN THE BASS", and Harmonic Theory > "Elevator System".

#### Updated Copy
* **Title:** IN THE BASS (Tilt Pitch)
* **Body:**
  > Tilt your phone **forward or backward (pitch)** to shift register and choose which chord tone sits in the bass.
  >
  > This enables **parallel motion**: imagine your hands moving together up or down a piano.
  >
  > *(With Tilt to Strum On)*: The readout shows your active bass note.
  > *(With Tilt to Strum Off)*: The top value is what sounded last, while the lower value is what you will hear if you tap a chord now.

***

### Step 3 (No-Tilt Session): IN THE BASS Selection

* **Target ID:** `tour-bass`
* **Applicable Sessions:** No-Tilt mode (Desktop or Phone without motion sensors)
* **Underlying Feature:** The IN THE BASS pill allows picking the bass inversion directly (Root, 3rd, 5th, 6th/7th). In No-Tilt mode, bass selection is independent of voicing floor (oblique motion): changing the voicing width leaves your bass note unchanged. A lock button allows saving your bass inversion per chord.
* **Help Menu Link:** Help Hub > "VOICING and IN THE BASS", and Harmonic Theory > "Elevator System".

#### Updated Copy
* **Title:** IN THE BASS
* **Body:**
  > Select which chord tone anchors the bass (**Root**, **3rd**, **5th**, or **6th/7th**) independently of your voicing floor.
  >
  > Tap the **lock icon** to bind your preferred bass inversion to this specific chord.

***

### Step 4: Voice Borrowing

* **Target ID:** `tour-borrowing`
* **Applicable Sessions:** Tilt and No-Tilt (Phone and Desktop)
* **Underlying Feature:** Four vertical sliders represent the four voices of the chord (Root, 3rd, 5th, 6th/7th). The center horizontal line represents the chord tone ("on chord"). Sliding up or down borrows a note from the "neighbor", which is the opposite vertex across the triangle (for example, Fire is the neighbor for Earth-Wind axis chords). This implements Barry Harris's borrowing system to construct the 8-note scale of chords. Tapping an active node a second time mutes that voice (turning it gray) for smaller voicings such as triads.
* **Help Menu Link:** Help Hub > "Voice Borrowing", and Harmonic Theory > "Borrowing from the Neighbors".

#### Updated Copy
* **Title:** Voice Borrowing
* **Body:**
  > Four vertical sliders represent the chord voices (**Root**, **3rd**, **5th**, **6th/7th**).
  >
  > Center is the chord tone; drag up or down to **borrow from the neighbor** (the opposite vertex) for extra color.
  >
  > Tap an active node to **mute that voice** (creating smaller voicings such as triads). Learn more under **Help > Borrowing from the Neighbors**.

***

### Step 5: Clock Face Diagram

* **Target ID:** `tour-clock`
* **Applicable Sessions:** Tilt and No-Tilt (Phone overlay and Desktop side panel)
* **Underlying Feature:** The 12-tone clock face displays pitch classes around a circular dial with the current Tonal Center at 12 o'clock. Active sounded notes light up in real time with parent element colors (Earth green, Wind blue, Fire red). In Settings, the layout mode can be toggled between Chromatic and Circle of Fifths. On desktop, it sits in the right-side panel; on mobile, it displays as an interactive overlay on the diagram.
* **Help Menu Link:** Help Hub > "How Movemental Works", and Help Hub > "Clock Face Diagram and Chord Naming".

#### Updated Copy
* **Title:** Clock Face Diagram
* **Body:**
  > The 12-tone clock face highlights active chord tones in real time using element colors: **Earth** (green), **Wind** (blue), and **Fire** (red).
  >
  > You can switch between **Chromatic** and **Circle of Fifths** layouts in Settings.
  >
  > On mobile, it appears as an interactive overlay; on desktop, it sits in the side panel.

***

### Step 6: Chord Naming System

* **Target ID:** `tour-chord-readout`
* **Applicable Sessions:** Tilt and No-Tilt (Phone overlay and Desktop side panel)
* **Underlying Feature:** Movemental identifies chords across four distinct musical layers:
  1. **Elemental Name:** The Barry Harris family and slice identity (such as Base Branch or Sister Trunk).
  2. **Chord Chemistry:** The elemental balance of Earth, Wind, and Fire DNA sounding in the chord (for example, 2 Earth · 2 Wind).
  3. **Traditional Name:** Standard jazz/classical chord symbol (such as Eb6 or F#m7b5).
  4. **Note Names:** The exact pitches sounding in the voicing (such as Eb3 G3 Bb3 C4).
  On mobile, this readout sits in the bottom-left corner of the diagram; on desktop, it sits directly above the clock dial.
* **Help Menu Link:** Help Hub > "How Movemental Works", and "Creation Theory".

#### Updated Copy
* **Title:** Chord Naming System
* **Body:**
  > Every chord displays a four-level readout:
  > • **Elemental Name**: family and sibling slice
  > • **Chord Chemistry**: Earth, Wind, and Fire balance
  > • **Traditional Name**: standard jazz/classical symbol
  > • **Note Names**: exact sounded pitches
  >
  > On mobile, this sits at the bottom-left; on desktop, it sits above the clock.

***

### Step 7: Settings

* **Target ID:** `tour-settings`
* **Applicable Sessions:** Tilt and No-Tilt (Phone and Desktop)
* **Underlying Feature:** Opens the settings modal to customize playback, layout, and sound:
  - **Playback & Performance:** Tonal Center, Home Octave, Play Style (Tap vs Tap & Hold), Tilt to Strum (live re-voicing on phone tilt with tempo rate limits), Retrigger Sounding Notes, and Voice Leading Mode (Root Position, Smooth, Smoothest).
  - **Diagram & Display:** Clock Face Diagram layout (Chromatic vs Circle of Fifths), Glowing Orbs toggle, Harmonic Function Labels, and Voicing Elevator Floors filtering.
  - **Voice Borrowing:** Memory mode toggle (Global vs Per-Chord).
  - **Sound Design:** Instrument Presets (Acoustic Piano, Rhodes, Warm Pad, Strings, Synth Lead, etc.), ADSR envelope parameters, EQ profiles, and master FX (Chorus, Delay, Reverb).
  - **Help & Theory:** Access to Barry Harris theory guides, tune scores, and restartable tour.
* **Help Menu Link:** Settings Modal > Help tab, and Help Hub > "Play Style, Settings, and Voice Leading".

#### Updated Copy
* **Title:** Settings
* **Body:**
  > Customize your instrument and performance:
  >
  > Adjust **tonal center**, **home octave**, **voice leading** (Root, Smooth, Smoothest), and **play style** (Tap vs Tap & Hold).
  >
  > On mobile, **Tilt to Strum** dynamically re-voices chords as you move. Explore **clock layouts** (Chromatic or Circle of Fifths), visual toggles, **synth presets**, ADSR envelopes, and audio FX.

***

### Step 8: Session Recording

* **Target ID:** `tour-record`
* **Applicable Sessions:** Tilt and No-Tilt (Phone and Desktop)
* **Underlying Feature:** The record button starts an active performance take. Movemental records two streams concurrently: full-fidelity audio (WebM, exportable to M4A/WAV) and standard multi-track MIDI (.mid). When stopped, playback gracefully fades, engages the panic switch, and displays options for listening back, downloading audio, or exporting MIDI.
* **Help Menu Link:** Help Hub > "Recording and Panic".

#### Updated Copy
* **Title:** Session Recording
* **Body:**
  > Capture your performance live in both **audio** and standard **MIDI**.
  >
  > When you stop, the take fades cleanly and opens the review window to audition your take, download audio, or export MIDI.

***

### Step 9: Panic Switch

* **Target ID:** `tour-panic`
* **Applicable Sessions:** Tilt and No-Tilt (Phone and Desktop)
* **Underlying Feature:** Instantly silences all sounding audio, cuts synth envelopes, releases active MIDI notes, and resets held chord state.
* **Help Menu Link:** Help Hub > "Recording and Panic".

#### Updated Copy
* **Title:** Panic Switch
* **Body:**
  > **Silences all sounding audio.**
  >
  > Stopping a recording session also engages this switch automatically.

---

## Suggested Help Menu Harmonization (HelpPage.tsx Updates)

The following sections in `src/components/help/HelpPage.tsx` and `src/components/help/helpTheoryContent.ts` are updated to match:

### 1. "VOICING and IN THE BASS" Section
* **Tilt Mode (`HELP_HUB_VOICING_TILT_BODY`):**
  > In Tilt mode, roll (tilting left or right) steps through nine elevator floors from narrow Unison (full tilt) to wide Double Octave (parallel to ground), enabling contrary motion. Pitch (tilting forward or backward) sets IN THE BASS, enabling parallel motion. When Tilt to Strum is on, the readout shows your live floor and bass note. When off, the top value is what sounded last, and the lower value is what will sound if you tap a chord now.
* **No-Tilt Mode (`HELP_HUB_VOICING_NO_TILT_BODY`):**
  > In No-Tilt mode, the VOICING pill selects an elevator floor from Unison to Double Octave using oblique motion (expanding upward from the bass). IN THE BASS sets the lowest chord tone independently. Lock buttons remember your voicing floor and bass inversion per chord.

### 2. "Clock Face Diagram and Chord Naming" Section (Replacing "Phone vs Desktop")
* **Help Copy:**
  > The Clock Face Diagram displays pitch classes around a circular dial with element colors (Earth green, Wind blue, Fire red), switchable between Chromatic and Circle of Fifths layouts in Settings. Every chord features a four-part naming system: Elemental Name, Chord Chemistry (Earth, Wind, Fire DNA balance), Traditional Name, and Note Names. On mobile, the clock and naming readout appear as on-screen overlays; on desktop, they sit in the side panel.

### 3. "Play Style, Settings, and Voice Leading" Section
* **Help Copy:**
  > Tap (Click on desktop) holds notes until you tap again or trigger panic. Tap & Hold releases notes when you let go. In Tilt mode, Tilt to Strum (on by default) dynamically re-voices chords as you move between tilt levels without retapping, with tempo rate limits set by BPM and Shortest Note. Retrigger Sounding Notes toggles whether common tones re-attack. Voice leading modes (Root Position, Smooth, Smoothest) control how parallel position transitions between chords. Settings also offers Tonal Center, Home Octave, Borrowing Memory (Global vs Per-Chord), Glowing Orbs, Harmonic Function Labels, Synth Presets, ADSR envelopes, EQ profiles, and audio FX (Chorus, Delay, Reverb).

---

## Next Steps

Review the updated tour steps and help copy above. Once you approve, I will update:
1. `src/tour/tourSteps.ts` with the new tour steps and copy (including mobile clock face and chord naming).
2. `src/components/ClockFace.tsx` with `data-tour-id` attributes for mobile clock and chord readout.
3. `src/components/help/HelpPage.tsx` and `src/components/help/helpTheoryContent.ts` with the harmonized help texts.
4. `src/tour/tourSteps.test.ts` to ensure all tests pass with the new step definitions.
