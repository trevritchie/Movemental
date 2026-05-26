/// <reference types="node" />
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SplashPage } from './SplashPage';
import fs from 'fs';
import path from 'path';

describe('SplashPage', () => {
  it('should render the mobile ringer warning', () => {
    const onEnter = vi.fn();
    render(<SplashPage onEnter={onEnter} />);
    const warning = screen.getByText(/Mobile users: Please ensure your device's ringer is ON to hear audio/i);
    expect(warning).toBeInTheDocument();
  });

  it('should display the warning correctly in landscape orientation (CSS verification)', () => {
    // JSDOM does not process external CSS media queries. To strictly follow TDD for this CSS-only bug,
    // we verify the CSS file contains the updated media query allowing visibility in landscape mobile (e.g., max-width: 950px).
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    
    // We expect the media query for the warning to be at least 950px to cover landscape phones
    // The previous regex was too loose. We should ensure the block is either @media (max-width: 950px) 
    // or we can just parse the file and find the exact media query block that contains .mobile-ringer-warning
    const ringerWarningMatch = cssContent.match(/@media[^{]+\{[^{}]*\.mobile-ringer-warning\s*\{\s*display:\s*block;\s*\}/);
    expect(ringerWarningMatch).not.toBeNull();
    
    // Now we check if the media query allows it to show on landscape (e.g. max-width: 950px or pointer: coarse)
    const mediaQuery = ringerWarningMatch ? ringerWarningMatch[0] : '';
    expect(mediaQuery).toMatch(/max-width:\s*950px|pointer:\s*coarse/);
  });
});
