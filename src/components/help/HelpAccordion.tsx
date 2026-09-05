import React from 'react';
import { ChevronDown } from 'lucide-react';

interface HelpAccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const HelpAccordion: React.FC<HelpAccordionProps> = ({
  title,
  defaultOpen = false,
  children,
}) => (
  <details className="help-page__accordion" open={defaultOpen ? true : undefined}>
    <summary className="help-page__accordion-header">
      <h4 className="help-page__section-title">{title}</h4>
      <ChevronDown size={18} className="help-page__accordion-icon" aria-hidden="true" />
    </summary>
    <div className="help-page__accordion-body">{children}</div>
  </details>
);
