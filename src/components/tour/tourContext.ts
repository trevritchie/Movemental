/**
 * Product tour React context hook.
 */
import { createContext, useContext } from 'react';
import type { TourStepDef } from '../../tour/tourSteps';

export interface TourContextValue {
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
  hasCompletedTour: boolean;
  dismissFirstRunPrompt: () => void;
  shouldShowFirstRunPrompt: boolean;
  markAppEntered: () => void;
}

export const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour must be used within TourProvider');
  }
  return ctx;
}
