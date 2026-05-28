/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Responsive Layout CSS', () => {
  const cssPath = path.resolve(process.cwd(), 'src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('should define portrait main-content column layout on mobile', () => {
    const portraitMatch = cssContent.match(
      /@media[^}]*orientation:\s*portrait[^}]*\{[\s\S]*?\.main-content\s*\{[^}]*flex-direction:\s*column/,
    );
    expect(
      portraitMatch,
      'Portrait media query for .main-content column layout is missing',
    ).not.toBeNull();
  });

  it('should lock mobile document scroll and overscroll', () => {
    const mobileBlock = cssContent.match(
      /@media\s*\(\s*max-width:\s*950px\s*\)\s*\{([\s\S]*?)\n\}/,
    );
    expect(mobileBlock, 'Mobile media query block is missing').not.toBeNull();

    const block = mobileBlock![1];
    expect(block).toMatch(/html,\s*body[\s\S]*overflow:\s*hidden/);
    expect(block).toMatch(/overscroll-behavior:\s*none/);
    expect(block).toMatch(/position:\s*fixed/);
  });

  it('should disable text selection and touch callouts on mobile shell', () => {
    const mobileBlock = cssContent.match(
      /@media\s*\(\s*max-width:\s*950px\s*\)\s*\{([\s\S]*?)\n\}/,
    );
    expect(mobileBlock).not.toBeNull();

    const block = mobileBlock![1];
    expect(block).toMatch(/-webkit-touch-callout:\s*none/);
    expect(block).toMatch(/user-select:\s*none/);
    expect(block).toMatch(
      /input[\s\S]*user-select:\s*text/,
    );
  });

  it('should ensure accessible touch targets (min 44px) for compactly stacked controls on mobile', () => {
    const mobileTouchTargetMatch = cssContent.match(
      /@media\s*\(\s*max-width:\s*950px[^}]*\{[\s\S]*?\.borrowing-row\s*\{[^}]*min-height:\s*44px/,
    );
    expect(
      mobileTouchTargetMatch,
      'Mobile .borrowing-row should have min-height: 44px for accessibility',
    ).not.toBeNull();
  });

  it('should ensure the diagram container overrides the 450px min-height on mobile to maximize space', () => {
    const minHeightMatch = cssContent.match(
      /@media[^}]*max-width:\s*950px[^}]*\{[\s\S]*?\.diagram-container\s*\{[^}]*min-height:\s*0/,
    );
    expect(
      minHeightMatch,
      'Mobile .diagram-container must override min-height to 0 to prevent overflow',
    ).not.toBeNull();

    const svgMatch = cssContent.match(
      /\.diagram-svg\s*\{[^}]*height:\s*100%/,
    );
    expect(
      svgMatch,
      '.diagram-svg must have height: 100% to fill container',
    ).not.toBeNull();
  });
});
