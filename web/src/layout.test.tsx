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
});
