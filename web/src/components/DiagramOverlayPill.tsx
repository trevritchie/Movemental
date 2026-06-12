import React from 'react';

interface DiagramOverlayPillProps {
  label?: string;
  align?: 'left' | 'right';
  corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  sizerText?: string;
  sizerContent?: React.ReactNode;
  className?: string;
  title?: string;
  children: React.ReactNode;
}

/**
 * Gemini-inspired glass pill for diagram corner overlays.
 */
export const DiagramOverlayPill: React.FC<DiagramOverlayPillProps> = ({
  label,
  align = 'left',
  corner,
  sizerText,
  sizerContent,
  className = '',
  title,
  children,
}) => {
  const cornerClass = corner
    ? ` diagram-overlay-pill--${corner}`
    : '';
  const alignClass =
    align === 'right' ? ' diagram-overlay-pill--align-right' : '';

  return (
    <div
      className={`diagram-overlay-pill${cornerClass}${alignClass} ${className}`.trim()}
      title={title}
    >
      {label && (
        <span className="diagram-overlay-pill__label">{label}</span>
      )}
      <div className="diagram-overlay-pill__value">
        {sizerContent && (
          <div
            className="diagram-overlay-pill__sizer diagram-overlay-pill__sizer--block"
            aria-hidden="true"
          >
            {sizerContent}
          </div>
        )}
        {sizerText && !sizerContent && (
          <span
            className="diagram-overlay-pill__sizer"
            aria-hidden="true"
          >
            {sizerText}
          </span>
        )}
        {children}
      </div>
    </div>
  );
};
