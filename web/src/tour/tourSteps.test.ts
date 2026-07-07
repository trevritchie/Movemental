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
      <div data-tour-id="tour-settings"></div>
      <div data-tour-id="tour-record"></div>
      <div data-tour-id="tour-panic"></div>
    `;
  });

  it('defines more no-tilt steps than tilt steps', () => {
    expect(NO_TILT_TOUR_STEPS.length).toBeGreaterThan(TILT_TOUR_STEPS.length);
  });

  it('loads different step counts for tilt vs no-tilt modes', () => {
    expect(getTourStepsForMode(true).length).toBe(7);
    expect(getTourStepsForMode(false).length).toBe(8);
  });

  it('skips desktop-only clock step on phone layout', () => {
    const noTilt = getTourStepsForMode(false);
    const desktopSteps = resolveAvailableTourSteps(noTilt, 'desktop');
    const phoneSteps = resolveAvailableTourSteps(noTilt, 'phone');

    expect(desktopSteps.some((step) => step.id === 'clock')).toBe(true);
    expect(phoneSteps.some((step) => step.id === 'clock')).toBe(false);
    expect(phoneSteps.length).toBeLessThan(desktopSteps.length);
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
});
