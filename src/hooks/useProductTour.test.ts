/// <reference types="node" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  TOUR_COMPLETED_KEY,
  useProductTour,
  writeTourCompleted,
} from './useProductTour';
import { getTourStepsForMode } from '../tour/tourSteps';

vi.mock('./useLayoutTier', () => ({
  useLayoutTier: vi.fn(() => 'desktop'),
}));

import { useLayoutTier } from './useLayoutTier';

function seedTourTargets(ids: string[]): void {
  document.body.innerHTML = ids
    .map((id) => `<div data-tour-id="${id}"></div>`)
    .join('');
}

describe('useProductTour', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    vi.mocked(useLayoutTier).mockReturnValue('desktop');
    seedTourTargets(
      getTourStepsForMode(false).map((step) => step.targetId),
    );
  });

  it('advances steps and marks completion on finish', () => {
    const { result } = renderHook(() => useProductTour(false));

    act(() => {
      result.current.startTour();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.stepIndex).toBe(0);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.stepIndex).toBe(1);

    const lastIndex = result.current.totalSteps - 1;
    act(() => {
      for (let i = result.current.stepIndex; i < lastIndex; i += 1) {
        result.current.nextStep();
      }
    });

    expect(result.current.isLastStep).toBe(true);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.isActive).toBe(false);
    expect(localStorage.getItem(TOUR_COMPLETED_KEY)).toBe('true');
  });

  it('skipTour persists completion', () => {
    const { result } = renderHook(() => useProductTour(true));

    act(() => {
      result.current.startTour();
    });

    act(() => {
      result.current.skipTour();
    });

    expect(result.current.isActive).toBe(false);
    expect(localStorage.getItem(TOUR_COMPLETED_KEY)).toBe('true');
  });

  it('writeTourCompleted persists across hook instances', () => {
    writeTourCompleted();
    const { result } = renderHook(() => useProductTour(false));
    expect(localStorage.getItem(TOUR_COMPLETED_KEY)).toBe('true');
    expect(result.current.isActive).toBe(false);
  });
});
