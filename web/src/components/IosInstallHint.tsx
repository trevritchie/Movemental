import React from 'react';
import { Share, X } from 'lucide-react';

interface IosInstallHintProps {
  onDismiss: () => void;
}

export const IosInstallHint: React.FC<IosInstallHintProps> = ({
  onDismiss,
}) => {
  return (
    <div
      className="ios-install-hint"
      role="dialog"
      aria-labelledby="ios-hint-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="ios-install-hint__header">
        <h3 id="ios-hint-title" className="ios-install-hint__title">
          Full Screen on iPhone
        </h3>
        <button
          type="button"
          className="ios-install-hint__close"
          onClick={onDismiss}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
      <p className="ios-install-hint__body">
        Tap the{' '}
        <Share size={14} className="ios-install-hint__inline-icon" />{' '}
        Share button, then Add to Home Screen.
      </p>
      <button
        type="button"
        className="ios-install-hint__dismiss-btn"
        onClick={onDismiss}
      >
        Got it
      </button>
    </div>
  );
};
