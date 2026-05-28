/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Responsive Layout CSS', () => {
  it('should define distinct main-content flex directions based on mobile orientation', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Verify portrait layout uses column
    const portraitMatch = cssContent.match(/@media[^}]*orientation:\s*portrait[^}]*\{[\s\S]*?\.main-content\s*\{[^}]*flex-direction:\s*column/);
    expect(portraitMatch, 'Portrait media query for .main-content column layout is missing').not.toBeNull();

    // Verify landscape layout uses row
    const landscapeMatch = cssContent.match(/@media[^}]*orientation:\s*landscape[^}]*\{[\s\S]*?\.main-content\s*\{[^}]*flex-direction:\s*row/);
    expect(landscapeMatch, 'Landscape media query for .main-content row layout is missing').not.toBeNull();
  });

  it('should ensure accessible touch targets (min 44px) for compactly stacked controls on mobile', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    const mobileTouchTargetMatch = cssContent.match(/@media\s*\(\s*max-width:\s*950px[^}]*\{[\s\S]*?\.borrowing-row\s*\{[^}]*min-height:\s*44px/);
    expect(mobileTouchTargetMatch, 'Mobile .borrowing-row should have min-height: 44px for accessibility').not.toBeNull();
  });

  it('should ensure the diagram container overrides the 450px min-height on mobile to maximize space', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // The global .diagram-container has min-height: 450px. 
    // We must ensure the mobile media query explicitly sets min-height: 0 to allow it to shrink 
    // on extremely short viewports, maximizing available space instead of pushing UI off-screen.
    // AND it should set height: 100% and width: 100% on .diagram-svg inside the mobile query 
    // or globally to ensure it scales up.
    
    // Check for min-height: 0 in the mobile query for .diagram-container
    const minHeightMatch = cssContent.match(/@media[^}]*max-width:\s*950px[^}]*\{[\s\S]*?\.diagram-container\s*\{[^}]*min-height:\s*0/);
    expect(minHeightMatch, 'Mobile .diagram-container must override min-height to 0 to prevent overflow').not.toBeNull();

    // Check that .diagram-svg has height: 100% to maximize its container
    const svgMatch = cssContent.match(/\.diagram-svg\s*\{[^}]*height:\s*100%/);
    expect(svgMatch, '.diagram-svg must have height: 100% to fill container').not.toBeNull();
  });
});
