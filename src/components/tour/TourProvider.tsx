/**
 * Product tour context and overlay portal.
 */
import React, {
  Suspense,
  lazy,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { useChordContext } from '../../context/ChordContext';
import {
  readTourCompleted,
  readTourPromptDismissed,
  useProductTour,
  writeTourPromptDismissed,
} from '../../hooks/useProductTour';
import { measureTourTarget } from '../../tour/tourSteps';
import { TourContext, type TourContextValue } from './tourContext';

const LazyTourOverlay = lazy(() =>
  import('./TourOverlay').then((module) => ({
    default: module.TourOverlay,
  })),
);

const LazyFirstRunTourPrompt = lazy(() =>
  import('./FirstRunTourPrompt').then((module) => ({
    default: module.FirstRunTourPrompt,
  })),
);

interface TourProviderProps {
  children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const { tiltModeEnabled } = useChordContext();
  const tour = useProductTour(tiltModeEnabled);
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(
    () => readTourPromptDismissed(),
  );
  const [hasCompletedTour, setHasCompletedTour] = useState(
    () => readTourCompleted(),
  );

  const markAppEntered = useCallback(() => {
    setHasEnteredApp(true);
  }, []);

  const dismissFirstRunPrompt = useCallback(() => {
    writeTourPromptDismissed();
    setPromptDismissed(true);
  }, []);

  const startTour = useCallback(
    (options?: { restart?: boolean }) => {
      dismissFirstRunPrompt();
      if (options?.restart) {
        setHasCompletedTour(false);
      }
      tour.startTour(options);
    },
    [dismissFirstRunPrompt, tour],
  );

  const finishTour = useCallback(() => {
    tour.finishTour();
    setHasCompletedTour(true);
  }, [tour]);

  const skipTour = useCallback(() => {
    tour.skipTour();
    setHasCompletedTour(true);
  }, [tour]);

  const nextStep = useCallback(() => {
    if (tour.isLastStep) {
      finishTour();
      return;
    }
    tour.nextStep();
  }, [finishTour, tour]);

  const shouldShowFirstRunPrompt =
    hasEnteredApp &&
    !promptDismissed &&
    !hasCompletedTour &&
    !tour.isActive;

  const showOverlay =
    tour.isActive &&
    tour.currentStep !== null &&
    measureTourTarget(tour.currentStep.targetId) !== null;

  const value = useMemo<TourContextValue>(
    () => ({
      isActive: tour.isActive,
      stepIndex: tour.stepIndex,
      currentStep: tour.currentStep,
      totalSteps: tour.totalSteps,
      isFirstStep: tour.isFirstStep,
      isLastStep: tour.isLastStep,
      startTour,
      nextStep,
      prevStep: tour.prevStep,
      skipTour,
      finishTour,
      hasCompletedTour,
      dismissFirstRunPrompt,
      shouldShowFirstRunPrompt,
      markAppEntered,
    }),
    [
      tour.isActive,
      tour.stepIndex,
      tour.currentStep,
      tour.totalSteps,
      tour.isFirstStep,
      tour.isLastStep,
      tour.prevStep,
      startTour,
      nextStep,
      skipTour,
      finishTour,
      hasCompletedTour,
      dismissFirstRunPrompt,
      shouldShowFirstRunPrompt,
      markAppEntered,
    ],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        {showOverlay && tour.currentStep && (
          <LazyTourOverlay
            step={tour.currentStep}
            stepIndex={tour.stepIndex}
            totalSteps={tour.totalSteps}
            isFirstStep={tour.isFirstStep}
            isLastStep={tour.isLastStep}
            onBack={tour.prevStep}
            onNext={nextStep}
            onSkip={skipTour}
          />
        )}
        {shouldShowFirstRunPrompt && (
          <LazyFirstRunTourPrompt
            onStart={() => startTour()}
            onDismiss={dismissFirstRunPrompt}
          />
        )}
      </Suspense>
    </TourContext.Provider>
  );
};
