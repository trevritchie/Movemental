/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderFormattedTourText } from './renderFormattedTourText';

describe('renderFormattedTourText', () => {
  it('splits paragraphs separated by double newlines into distinct paragraph elements', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const { container } = render(<div>{renderFormattedTourText(text)}</div>);
    const paragraphs = container.querySelectorAll('p.tour-popover__paragraph');
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0].textContent).toBe('First paragraph.');
    expect(paragraphs[1].textContent).toBe('Second paragraph.');
    expect(paragraphs[2].textContent).toBe('Third paragraph.');
  });

  it('renders bold tags for **text** tokens', () => {
    const text = '**Earth**, **Wind**, and **Fire** are diminished parent vertices.';
    const { container } = render(<div>{renderFormattedTourText(text)}</div>);
    const strongs = container.querySelectorAll('strong');
    expect(strongs).toHaveLength(3);
    expect(strongs[0].textContent).toBe('Earth');
    expect(strongs[1].textContent).toBe('Wind');
    expect(strongs[2].textContent).toBe('Fire');
  });

  it('renders line breaks for single newlines within paragraphs', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const { container } = render(<div>{renderFormattedTourText(text)}</div>);
    const brs = container.querySelectorAll('br');
    expect(brs).toHaveLength(2);
  });
});
