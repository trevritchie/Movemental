/**
 * Product tour step definitions for tilt and no-tilt sessions.
 */
import type { LayoutTier } from '../layout/breakpoints';

export type TourLayoutFilter = 'phone' | 'desktop' | 'any';

export interface TourStepDef {
  id: string;
  targetId: string;
  title: string;
  body: string;
  /** When set, step is only included for matching layout tiers. */
  layouts?: TourLayoutFilter[];
}

export function getTiltTourSteps(tiltToStrum = true): TourStepDef[] {
  return [
    {
      id: 'diagram',
      targetId: 'tour-diagram',
      title: 'Elemental diagram',
      body:
        '**Earth**, **Wind**, and **Fire** are diminished parent vertices at the triangle corners.\n\n' +
        '**Child families** (created by combining notes from two parents) sit along each axis, ' +
        'each divided into four sibling slices: **Base**, **Brother**, **Twin**, and **Sister**.\n\n' +
        'Tap any chord to play it, or **drag across slices** for smooth voice-led transitions.',
    },
    {
      id: 'voicing',
      targetId: 'tour-voicing',
      title: 'VOICING (tilt roll)',
      body:
        'Tilt your phone **left or right (roll)** to step through nine **elevator floors**, ' +
        'from narrow **Unison** (full tilt) to wide **Double Octave** (flat).\n\n' +
        'This enables **contrary motion**: imagine your hands moving closer together or further apart on a piano.\n\n' +
        (tiltToStrum
          ? 'The readout shows your active floor.'
          : 'The top value is what sounded last, while the lower value is what you will hear if you tap a chord now.'),
    },
    {
      id: 'bass',
      targetId: 'tour-bass',
      title: 'IN THE BASS (tilt pitch)',
      body:
        'Tilt your phone **forward or backward (pitch)** to shift register and choose which chord tone sits in the bass.\n\n' +
        'This enables **parallel motion**: imagine your hands moving together up or down a piano.\n\n' +
        (tiltToStrum
          ? 'The readout shows your active bass note.'
          : 'The top value is what sounded last, while the lower value is what you will hear if you tap a chord now.'),
    },
    {
      id: 'borrowing',
      targetId: 'tour-borrowing',
      title: 'Voice borrowing',
      body:
        'Four vertical sliders represent the chord voices (**Root**, **3rd**, **5th**, **6th/7th**).\n\n' +
        'Center is the chord tone; drag up or down to **borrow from the neighbor** (the opposite vertex) for extra color.\n\n' +
        'Tap an active node to **mute that voice** (creating smaller voicings such as triads). ' +
        'Learn more under **Help > Borrowing from the Neighbors**.',
    },
    {
      id: 'clock',
      targetId: 'tour-clock',
      title: 'Clock Face Diagram',
      body:
        'The 12-tone clock face highlights active chord tones in real time using element colors: ' +
        '**Earth** (green), **Wind** (blue), and **Fire** (red).\n\n' +
        'You can switch between **Chromatic** and **Circle of Fifths** layouts in Settings.',
    },
    {
      id: 'chord-readout',
      targetId: 'tour-chord-readout',
      title: 'Chord naming system',
      body:
        'Every chord displays a four-level readout:\n' +
        '• **Elemental Name**: family and sibling slice\n' +
        '• **Chord Chemistry**: Earth, Wind, and Fire balance\n' +
        '• **Traditional Name**: standard jazz/classical symbol\n' +
        '• **Note Names**: exact sounded pitches'
    },
    {
      id: 'settings',
      targetId: 'tour-settings',
      title: 'Settings',
      body:
        'Customize your instrument and performance:\n\n' +
        'Adjust **tonal center**, **home octave**, **voice leading** (Root, Smooth, Smoothest), ' +
        'and **play style** (Tap vs Tap & Hold).\n\n' +
        'On mobile, **Tilt to Strum** dynamically re-voices chords as you move. ' +
        'Explore **clock layouts** (Chromatic or Circle of Fifths), visual toggles, ' +
        '**synth presets**, ADSR envelopes, and audio FX.',
    },
    {
      id: 'record',
      targetId: 'tour-record',
      title: 'Session recording',
      body:
        'Capture your performance live in both **audio** and standard **MIDI**.\n\n' +
        'When you stop, the take fades cleanly and opens the review window to audition your take, ' +
        'download audio, or export MIDI.',
    },
    {
      id: 'panic',
      targetId: 'tour-panic',
      title: 'Panic switch',
      body:
        '**Silences all sounding audio.**\n\n' +
        'Stopping a recording session also engages this switch automatically.',
    },
  ];
}

const TILT_TOUR_STEPS: TourStepDef[] = getTiltTourSteps(true);

const NO_TILT_TOUR_STEPS: TourStepDef[] = [
  {
    id: 'diagram',
    targetId: 'tour-diagram',
    title: 'Elemental diagram',
    body:
      '**Earth**, **Wind**, and **Fire** are diminished parent vertices at the triangle corners.\n\n' +
      '**Child families** (created by combining notes from two parents) sit along each axis, ' +
      'each divided into four sibling slices: **Base**, **Brother**, **Twin**, and **Sister**.\n\n' +
      'Tap any chord to play it, or **drag across slices** for smooth voice-led transitions.',
  },
  {
    id: 'voicing',
    targetId: 'tour-voicing',
    title: 'Voicing',
    body:
      'Choose an **elevator floor** from the **VOICING** pill to shape chord width, ' +
      'from narrow **Unison** to wide **Double Octave**.\n\n' +
      'In No-Tilt mode, width expands upward from the bass.\n\n' +
      'Tap the **lock icon** to save your voicing floor specifically for this chord.',
  },
  {
    id: 'bass',
    targetId: 'tour-bass',
    title: 'IN THE BASS',
    body:
      'Select which chord tone anchors the bass (**Root**, **3rd**, **5th**, or **6th/7th**) ' +
      'independently of your voicing floor.\n\n' +
      'Tap the **lock icon** to bind your preferred bass inversion to this specific chord.',
  },
  {
    id: 'borrowing',
    targetId: 'tour-borrowing',
    title: 'Voice borrowing',
    body:
      'Four vertical sliders represent the chord voices (**Root**, **3rd**, **5th**, **6th/7th**).\n\n' +
      'Center is the chord tone; drag up or down to **borrow from the neighbor** (the opposite vertex) for extra color.\n\n' +
      'Tap an active node to **mute that voice** (creating smaller voicings such as triads). ' +
      'Learn more under **Help > Borrowing from the Neighbors**.',
  },
  {
    id: 'clock',
    targetId: 'tour-clock',
    title: 'Clock Face Diagram',
    body:
      'The 12-tone clock face highlights active chord tones in real time using element colors: ' +
      '**Earth** (green), **Wind** (blue), and **Fire** (red).\n\n' +
      'You can switch between **Chromatic** and **Circle of Fifths** layouts in Settings.',
  },
  {
    id: 'chord-readout',
    targetId: 'tour-chord-readout',
    title: 'Chord naming system',
    body:
      'Every chord displays a four-level readout:\n' +
      '• **Elemental Name**: family and sibling slice\n' +
      '• **Chord Chemistry**: Earth, Wind, and Fire balance\n' +
      '• **Traditional Name**: standard jazz/classical symbol\n' +
      '• **Note Names**: exact sounded pitches',
  },
  {
    id: 'settings',
    targetId: 'tour-settings',
    title: 'Settings',
    body:
      'Customize your instrument and performance:\n\n' +
      'Adjust **tonal center**, **home octave**, **voice leading** (Root, Smooth, Smoothest), ' +
      'and **play style** (Tap vs Tap & Hold).\n\n' +
      'Explore **clock layouts** (Chromatic or Circle of Fifths), visual toggles, ' +
      '**synth presets**, ADSR envelopes, and audio FX.',
  },
  {
    id: 'record',
    targetId: 'tour-record',
    title: 'Session recording',
    body:
      'Capture your performance live in both **audio** and standard **MIDI**.\n\n' +
      'When you stop, the take fades cleanly and opens the review window to audition your take, ' +
      'download audio, or export MIDI.',
  },
  {
    id: 'panic',
    targetId: 'tour-panic',
    title: 'Panic switch',
    body:
      '**Silences all sounding audio.**\n\n' +
      'Stopping a recording session also engages this switch automatically.',
  },
];

export function getTourStepsForMode(
  tiltModeEnabled: boolean,
  tiltToStrum = true,
): TourStepDef[] {
  return tiltModeEnabled ? getTiltTourSteps(tiltToStrum) : NO_TILT_TOUR_STEPS;
}

export function findTourTarget(targetId: string): Element | null {
  return document.querySelector(`[data-tour-id="${targetId}"]`);
}

export function measureTourTarget(targetId: string): {
  top: number;
  left: number;
  width: number;
  height: number;
} | null {
  const el = findTourTarget(targetId);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return null;
  const pad = 8;
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

function layoutMatchesFilter(
  layoutTier: LayoutTier,
  layouts: TourLayoutFilter[] | undefined,
): boolean {
  if (!layouts || layouts.length === 0 || layouts.includes('any')) {
    return true;
  }
  const key: TourLayoutFilter =
    layoutTier === 'phone' ? 'phone' : 'desktop';
  return layouts.includes(key);
}

/** Steps available for the current layout and DOM. */
export function resolveAvailableTourSteps(
  steps: TourStepDef[],
  layoutTier: LayoutTier,
): TourStepDef[] {
  return steps.filter(
    (step) =>
      layoutMatchesFilter(layoutTier, step.layouts) &&
      findTourTarget(step.targetId) !== null,
  );
}

export { TILT_TOUR_STEPS, NO_TILT_TOUR_STEPS };
