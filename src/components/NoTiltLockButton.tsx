import React from 'react';
import { Lock, LockOpen } from 'lucide-react';

interface NoTiltLockButtonProps {
  locked: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}

export const NoTiltLockButton: React.FC<NoTiltLockButtonProps> = ({
  locked,
  disabled = false,
  label,
  onToggle,
}) => {
  const Icon = locked ? Lock : LockOpen;

  return (
    <button
      type="button"
      className={`diagram-overlay-lock${locked ? ' diagram-overlay-lock--active' : ''}`}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={locked}
      aria-label={label}
      title={label}
    >
      <Icon size={14} strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
};
