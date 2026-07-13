/**
 * Highlighted app-specific tip within a help article.
 */
import React from 'react';

interface HelpCalloutProps {
  children: React.ReactNode;
  label?: string;
}

export const HelpCallout: React.FC<HelpCalloutProps> = ({
  children,
  label = 'In Movemental',
}) => (
  <aside className="help-callout" aria-label={label}>
    <span className="help-callout__label">{label}</span>
    <div className="help-callout__body">{children}</div>
  </aside>
);
