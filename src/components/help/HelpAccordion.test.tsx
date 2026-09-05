/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HelpAccordion } from './HelpAccordion';

describe('HelpAccordion', () => {
  it('renders summary title and children', () => {
    render(
      <HelpAccordion title="Test Accordion Section">
        <p>Test accordion content body</p>
      </HelpAccordion>,
    );

    expect(screen.getByText('Test Accordion Section')).toBeInTheDocument();
    expect(screen.getByText('Test accordion content body')).toBeInTheDocument();
  });

  it('starts collapsed by default unless defaultOpen is set', () => {
    const { container: closedContainer } = render(
      <HelpAccordion title="Closed Section">
        <p>Content</p>
      </HelpAccordion>,
    );
    const detailsClosed = closedContainer.querySelector('details');
    expect(detailsClosed).not.toHaveAttribute('open');

    const { container: openContainer } = render(
      <HelpAccordion title="Open Section" defaultOpen>
        <p>Content</p>
      </HelpAccordion>,
    );
    const detailsOpen = openContainer.querySelector('details');
    expect(detailsOpen).toHaveAttribute('open');
  });
});
