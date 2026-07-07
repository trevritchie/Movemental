/**
 * Product tour state: step navigation, localStorage persistence, skip.
 */
import { useCallback, useMemo, useState } from 'react';
import { useLayoutTier } from './useLayoutTier';
import {
  getTourStepsForMode,
  resolveAvailableTourSteps,
  type TourStepDef,
} from '../tour/tourSteps';

export const TOUR_COMPLETED_KEY = 'movemental-tour-completed';
export const TOUR_PROMPT_DISMISSED_KEY = 'movemental-tour-prompt-dismissed';

export function readTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeTourCompleted(): void {
  try {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
  } catch {
    /* ignore quota / private mode */
  }
}

export function readTourPromptDismissed(): boolean {
  try {
    return localStorage.getItem(TOUR_PROMPT_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeTourPromptDismissed(): void {
  try {
    localStorage.setItem(TOUR_PROMPT_DISMISSED_KEY, 'true');
  } catch {
    /* ignore */
  }
}

export interface ProductTourState {
  isActive: boolean;
  stepIndex: number;
  currentStep: TourStepDef | null;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  startTour: (options?: { restart?: boolean }) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
}

export function useProductTour(tiltModeEnabled: boolean): ProductTourState {
  const layoutTier = useLayoutTier();
  const baseSteps = useMemo(
    () => getTourStepsForMode(tiltModeEnabled),
    [tiltModeEnabled],
  );

  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [availableSteps, setAvailableSteps] = useState<TourStepDef[]>([]);

  const refreshAvailableSteps = useCallback(() => {
    const resolved = resolveAvailableTourSteps(baseSteps, layoutTier);
    setAvailableSteps(resolved);
    return resolved;
  }, [baseSteps, layoutTier]);

  const finishTour = useCallback(() => {
    writeTourCompleted();
    setIsActive(false);
    setStepIndex(0);
  }, []);

  const startTour = useCallback(
    (options?: { restart?: boolean }) => {
      const resolved = refreshAvailableSteps();
      if (resolved.length === 0) return;
      if (options?.restart) {
        try {
          localStorage.removeItem(TOUR_COMPLETED_KEY);
        } catch {
          /* ignore */
        }
      }
      setStepIndex(0);
      setIsActive(true);
    },
    [refreshAvailableSteps],
  );

  const nextStep = useCallback(() => {
    setStepIndex((prev) => {
      const steps = resolveAvailableTourSteps(baseSteps, layoutTier);
      if (prev >= steps.length - 1) {
        writeTourCompleted();
        setIsActive(false);
        return 0;
      }
      return prev + 1;
    });
  }, [baseSteps, layoutTier]);

  const prevStep = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTour = useCallback(() => {
    finishTour();
  }, [finishTour]);

  const activeSteps = isActive
    ? resolveAvailableTourSteps(baseSteps, layoutTier)
    : availableSteps;

  const currentStep =
    isActive && activeSteps.length > 0
      ? activeSteps[Math.min(stepIndex, activeSteps.length - 1)]
      : null;

  const totalSteps = isActive
    ? resolveAvailableTourSteps(baseSteps, layoutTier).length
    : 0;

  return {
    isActive,
    stepIndex,
    currentStep,
    totalSteps,
    isFirstStep: stepIndex <= 0,
    isLastStep: totalSteps > 0 && stepIndex >= totalSteps - 1,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
  };
}
