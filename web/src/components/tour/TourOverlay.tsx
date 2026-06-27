/**
 * Spotlight backdrop and step popover for the product tour.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  findTourTarget,
  measureTourTarget,
  type TourStepDef,
} from '../../tour/tourSteps';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { popoverStyle } from './tourPopoverPlacement';

interface TourOverlayProps {
  step: TourStepDef;
  stepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export const TourOverlay: React.FC<TourOverlayProps> = ({
  step,
  stepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  onBack,
  onNext,
  onSkip,
}) => {
  const [layoutVersion, setLayoutVersion] = useState(0);

  useBodyScrollLock(true);

  void layoutVersion;
  const targetRect = measureTourTarget(step.targetId);

  useEffect(() => {
    const update = () => setLayoutVersion((value) => value + 1);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step.targetId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        onNext();
        return;
      }
      if (e.key === 'ArrowLeft' && !isFirstStep) {
        e.preventDefault();
        onBack();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isFirstStep, onBack, onNext, onSkip]);

  useEffect(() => {
    const el = findTourTarget(step.targetId);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [step.targetId]);

  const popoverPosition = targetRect ? popoverStyle(targetRect) : null;

  if (!targetRect || !popoverPosition) {
    return null;
  }

  return createPortal(
    <div className="tour-overlay" role="presentation">
      <div
        className="tour-spotlight"
        style={{
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
        }}
        aria-hidden="true"
      />
      <div
        className="tour-popover glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-popover-title"
        style={popoverPosition}
      >
        <p className="tour-popover__progress">
          Step {stepIndex + 1} of {totalSteps}
        </p>
        <h3 id="tour-popover-title" className="tour-popover__title">
          {step.title}
        </h3>
        <p className="tour-popover__body">{step.body}</p>
        <div className="tour-popover__actions">
          <button
            type="button"
            className="tour-popover__btn tour-popover__btn--ghost"
            onClick={onSkip}
          >
            Skip
          </button>
          <div className="tour-popover__nav">
            {!isFirstStep && (
              <button
                type="button"
                className="tour-popover__btn tour-popover__btn--secondary"
                onClick={onBack}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="tour-popover__btn tour-popover__btn--primary"
              onClick={onNext}
            >
              {isLastStep ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
