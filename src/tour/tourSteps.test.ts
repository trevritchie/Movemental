/// <reference types="node" />
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTourStepsForMode,
  resolveAvailableTourSteps,
  TILT_TOUR_STEPS,
  NO_TILT_TOUR_STEPS,
} from './tourSteps';

describe('tourSteps', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-tour-id="tour-diagram"></div>
      <div data-tour-id="tour-voicing"></div>
      <div data-tour-id="tour-bass"></div>
      <div data-tour-id="tour-borrowing"></div>
      <div data-tour-id="tour-clock"></div>
      <div data-tour-id="tour-chord-readout"></div>
      <div data-tour-id="tour-settings"></div>
      <div data-tour-id="tour-record"></div>
      <div data-tour-id="tour-panic"></div>
    `;
  });

  it('defines 9 steps for both tilt and no-tilt modes with distinct voicing and bass copy', () => {
    const tiltSteps = getTourStepsForMode(true);
    const noTiltSteps = getTourStepsForMode(false);

    expect(tiltSteps).toHaveLength(9);
    expect(noTiltSteps).toHaveLength(9);

    const tiltVoicing = tiltSteps.find((s) => s.id === 'voicing');
    const noTiltVoicing = noTiltSteps.find((s) => s.id === 'voicing');
    expect(tiltVoicing?.title).toContain('tilt roll');
    expect(noTiltVoicing?.title).toBe('Voicing');

    const tiltBass = tiltSteps.find((s) => s.id === 'bass');
    const noTiltBass = noTiltSteps.find((s) => s.id === 'bass');
    expect(tiltBass?.title).toContain('tilt pitch');
    expect(noTiltBass?.title).toBe('IN THE BASS');
  });

  it('includes clock face diagram and chord readout on both phone and desktop layouts', () => {
    const noTilt = getTourStepsForMode(false);
    const desktopSteps = resolveAvailableTourSteps(noTilt, 'desktop');
    const phoneSteps = resolveAvailableTourSteps(noTilt, 'phone');

    expect(desktopSteps.some((step) => step.id === 'clock')).toBe(true);
    expect(desktopSteps.some((step) => step.id === 'chord-readout')).toBe(true);
    expect(phoneSteps.some((step) => step.id === 'clock')).toBe(true);
    expect(phoneSteps.some((step) => step.id === 'chord-readout')).toBe(true);
  });

  it('skips steps when tour targets are missing from the DOM', () => {
    document.body.innerHTML = '<div data-tour-id="tour-diagram"></div>';
    const resolved = resolveAvailableTourSteps(TILT_TOUR_STEPS, 'desktop');
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.id).toBe('diagram');
  });

  it('uses neighbor and elevator floors language in tour copy', () => {
    const tiltBorrow = TILT_TOUR_STEPS.find((step) => step.id === 'borrowing');
    const tiltVoicing = TILT_TOUR_STEPS.find((step) => step.id === 'voicing');
    const noTiltVoicing = NO_TILT_TOUR_STEPS.find(
      (step) => step.id === 'voicing',
    );

    expect(tiltBorrow?.body).toMatch(/neighbor/i);
    expect(tiltBorrow?.body).toMatch(/Borrowing from the Neighbors/i);
    expect(tiltVoicing?.body).toMatch(/elevator floors/i);
    expect(noTiltVoicing?.body).toMatch(/elevator floor/i);
  });

  it('conditionally displays readout instructions based on tiltToStrum setting', () => {
    const strumOnSteps = getTourStepsForMode(true, true);
    const strumOffSteps = getTourStepsForMode(true, false);

    const onVoicing = strumOnSteps.find((s) => s.id === 'voicing');
    const offVoicing = strumOffSteps.find((s) => s.id === 'voicing');
    expect(onVoicing?.body).toContain('The readout shows your active floor.');
    expect(offVoicing?.body).toContain(
      'The top value is what sounded last, while the lower value is what you will hear if you tap a chord now.',
    );

    const onBass = strumOnSteps.find((s) => s.id === 'bass');
    const offBass = strumOffSteps.find((s) => s.id === 'bass');
    expect(onBass?.body).toContain('The readout shows your active bass note.');
    expect(offBass?.body).toContain(
      'The top value is what sounded last, while the lower value is what you will hear if you tap a chord now.',
    );
  });
});
