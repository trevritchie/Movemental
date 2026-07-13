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

const TILT_TOUR_STEPS: TourStepDef[] = [
  {
    id: 'diagram',
    targetId: 'tour-diagram',
    title: 'Elemental diagram',
    body:
      'Earth, Wind, and Fire are parent vertices at the triangle corners. ' +
      'Child groups sit on each axis. Tap any chord to hear it.',
  },
  {
    id: 'voicing',
    targetId: 'tour-voicing',
    title: 'VOICING (tilt roll)',
    body:
      'Tilt your phone left or right (roll) to step through elevator floors, ' +
      'from narrow Unison to wide Double Octave. Watch the VOICING readout.',
  },
  {
    id: 'bass',
    targetId: 'tour-bass',
    title: 'IN THE BASS (tilt pitch)',
    body:
      'Tilt forward and back (pitch) to choose which chord tone sits in the ' +
      'bass. The label shows what will sound on your next tap.',
  },
  {
    id: 'borrowing',
    targetId: 'tour-borrowing',
    title: 'Voice borrowing',
    body:
      'Four vertical sliders borrow from the neighbor (the opposite vertex). ' +
      'Drag up or down, or tap the active node again to mute that voice. ' +
      'Learn more under Help > Borrowing from the Neighbors.',
  },
  {
    id: 'settings',
    targetId: 'tour-settings',
    title: 'Settings',
    body:
      'Open settings for tonal center, Home Octave, play style, voice ' +
      'leading mode, and synth options.',
  },
  {
    id: 'record',
    targetId: 'tour-record',
    title: 'Session recording',
    body:
      'Record your playing as audio and MIDI. Stop ends the take with a ' +
      'short fade and opens review so you can download or share.',
  },
  {
    id: 'panic',
    targetId: 'tour-panic',
    title: 'Panic switch',
    body:
      'Instantly stops all sounding notes. Recording stop also triggers ' +
      'the panic switch.',
  },
];

const NO_TILT_TOUR_STEPS: TourStepDef[] = [
  {
    id: 'diagram',
    targetId: 'tour-diagram',
    title: 'Elemental diagram',
    body:
      'Earth, Wind, and Fire are parent vertices at the triangle corners. ' +
      'Child groups sit on each axis. Tap any chord to hear it.',
  },
  {
    id: 'voicing',
    targetId: 'tour-voicing',
    title: 'Voicing',
    body:
      'Choose an elevator floor from the VOICING dropdown. Lock voicing per ' +
      'chord so your choice stays when you navigate away and back.',
  },
  {
    id: 'bass',
    targetId: 'tour-bass',
    title: 'IN THE BASS',
    body:
      'Pick which chord tone is in the bass, separate from the voicing floor. ' +
      'Lock bass per chord to keep your choice across visits to the same chord.',
  },
  {
    id: 'borrowing',
    targetId: 'tour-borrowing',
    title: 'Voice borrowing',
    body:
      'Four vertical sliders borrow from the neighbor (the opposite vertex). ' +
      'Drag up or down, or tap the active node again to mute that voice. ' +
      'Learn more under Help > Borrowing from the Neighbors.',
  },
  {
    id: 'clock',
    targetId: 'tour-clock',
    title: 'Clock face',
    layouts: ['desktop'],
    body:
      'On desktop, the clock shows the tonal center, active pitches, and ' +
      'elemental chemistry for the chord you are playing.',
  },
  {
    id: 'settings',
    targetId: 'tour-settings',
    title: 'Settings',
    body:
      'Open settings for tonal center, Home Octave, play style, voice ' +
      'leading mode, and synth options.',
  },
  {
    id: 'record',
    targetId: 'tour-record',
    title: 'Session recording',
    body:
      'Record your playing as audio and MIDI. Stop ends the take with a ' +
      'short fade and opens review so you can download or share.',
  },
  {
    id: 'panic',
    targetId: 'tour-panic',
    title: 'Panic switch',
    body:
      'Instantly stops all sounding notes. Recording stop also triggers ' +
      'the panic switch.',
  },
];

export function getTourStepsForMode(tiltModeEnabled: boolean): TourStepDef[] {
  return tiltModeEnabled ? TILT_TOUR_STEPS : NO_TILT_TOUR_STEPS;
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
