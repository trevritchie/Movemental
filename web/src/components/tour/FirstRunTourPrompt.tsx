/**
 * Optional first-run prompt to start the interactive tour.
 */
import React from 'react';
import { createPortal } from 'react-dom';

interface FirstRunTourPromptProps {
  onStart: () => void;
  onDismiss: () => void;
}

export const FirstRunTourPrompt: React.FC<FirstRunTourPromptProps> = ({
  onStart,
  onDismiss,
}) => {
  return createPortal(
    <div className="tour-prompt-backdrop" role="presentation">
      <div
        className="tour-prompt glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-prompt-title"
      >
        <h2 id="tour-prompt-title" className="tour-prompt__title">
          Take a quick tour?
        </h2>
        <p className="tour-prompt__body">
          A short walkthrough highlights the diagram, elevator voicing,
          neighbor borrowing, and session tools.
        </p>
        <div className="tour-prompt__actions">
          <button
            type="button"
            className="tour-prompt__btn tour-prompt__btn--secondary"
            onClick={onDismiss}
          >
            Not now
          </button>
          <button
            type="button"
            className="tour-prompt__btn tour-prompt__btn--primary"
            onClick={onStart}
          >
            Start tour
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
