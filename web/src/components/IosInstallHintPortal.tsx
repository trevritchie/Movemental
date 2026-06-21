import React from 'react';
import { createPortal } from 'react-dom';
import { IosInstallHint } from './IosInstallHint';

interface IosInstallHintPortalProps {
  isOpen: boolean;
  onDismiss: () => void;
}

/** Portaled overlay so the hint is not clipped by bottom-panel overflow. */
export const IosInstallHintPortal: React.FC<IosInstallHintPortalProps> = ({
  isOpen,
  onDismiss,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onDismiss();
  };

  return createPortal(
    <div
      className="ios-hint-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <IosInstallHint onDismiss={onDismiss} />
    </div>,
    document.body,
  );
};
