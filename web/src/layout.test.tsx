/// <reference types="node" />
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { BREAKPOINTS, PHONE_LANDSCAPE_BLOCK_MEDIA } from './layout/breakpoints';
import { useLayoutTier } from './hooks/useLayoutTier';
import { usePhoneLandscapeBlocked } from './hooks/usePhoneLandscapeBlocked';

describe('Responsive Layout CSS', () => {
  const cssPath = path.resolve(process.cwd(), 'src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const breakpointsCssPath = path.resolve(
    process.cwd(),
    'src/layout/breakpoints.css',
  );
  const breakpointsCss = fs.readFileSync(breakpointsCssPath, 'utf-8');

  const phoneLayoutPattern =
    /\(max-width:\s*767px\)[\s\S]*?\(max-width:\s*950px\)\s*and\s*\(\s*orientation:\s*portrait\s*\)\s*and\s*\(\s*pointer:\s*coarse\s*\)/;

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
    expect(cssContent).toMatch(phoneLayoutPattern);

    const phoneStart = cssContent.search(phoneLayoutPattern);
    expect(phoneStart).toBeGreaterThan(-1);

    const phoneBlock = cssContent.slice(phoneStart, phoneStart + 2500);
    expect(phoneBlock).toMatch(/html,\s*body[\s\S]*overflow:\s*hidden/);
    expect(phoneBlock).toMatch(/overscroll-behavior:\s*none/);
    expect(phoneBlock).toMatch(/position:\s*fixed/);
  });

  it('should disable text selection and touch callouts on mobile shell', () => {
    const phoneStart = cssContent.search(phoneLayoutPattern);
    const phoneBlock = cssContent.slice(phoneStart, phoneStart + 2500);

    expect(phoneBlock).toMatch(/-webkit-touch-callout:\s*none/);
    expect(phoneBlock).toMatch(/user-select:\s*none/);
    expect(phoneBlock).toMatch(/input[\s\S]*user-select:\s*text/);
  });

  it('should ensure accessible touch targets (min 44px) for compactly stacked controls on mobile', () => {
    const mobileTouchTargetMatch = cssContent.match(
      /\(max-width: 767px\)[\s\S]*?\.borrowing-row\s*\{[^}]*min-height:\s*44px/,
    );
    expect(
      mobileTouchTargetMatch,
      'Mobile .borrowing-row should have min-height: 44px for accessibility',
    ).not.toBeNull();
  });

  it('should ensure the diagram container overrides the 450px min-height on mobile to maximize space', () => {
    const minHeightMatch = cssContent.match(
      /\(max-width: 767px\)[\s\S]*?\.diagram-container\s*\{[^}]*min-height:\s*0/,
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

  it('should not block all coarse-pointer landscape devices globally in CSS', () => {
    expect(cssContent).not.toMatch(
      /\(pointer:\s*coarse\)\s*and\s*\(\s*orientation:\s*landscape\s*\)\s*\{/,
    );
  });

  it('should not hide app via CSS visibility when orientation is blocked', () => {
    expect(cssContent).not.toMatch(
      /#root\s*>\s*\*:not\(\.orientation-blocker\)/,
    );
  });

  it('should define orientation blocker base styles for React conditional render', () => {
    expect(cssContent).toMatch(/\.orientation-blocker\s*\{[^}]*display:\s*flex/);
    expect(cssContent).toMatch(/\.orientation-blocker\s*\{[^}]*position:\s*fixed/);
  });

  it('should keep phone landscape block media aligned with breakpoint constants', () => {
    expect(PHONE_LANDSCAPE_BLOCK_MEDIA).toContain(
      `${BREAKPOINTS.phoneLandscapeMaxHeight}px`,
    );
    expect(PHONE_LANDSCAPE_BLOCK_MEDIA).toContain(
      `${BREAKPOINTS.phoneMax}px`,
    );
    expect(PHONE_LANDSCAPE_BLOCK_MEDIA).toContain('pointer: coarse');
    expect(PHONE_LANDSCAPE_BLOCK_MEDIA).toContain('orientation: landscape');
  });

  it('should define tablet touch layout between 768px and 1199px', () => {
    expect(cssContent).toMatch(
      /@media\s*\(\s*min-width:\s*768px\s*\)\s*and\s*\(\s*max-width:\s*1199px\s*\)\s*and\s*\(\s*pointer:\s*coarse\s*\)/,
    );
  });

  it('should keep breakpoint CSS custom properties in sync with TypeScript constants', () => {
    expect(breakpointsCss).toContain(
      `--bp-phone-max: ${BREAKPOINTS.phoneMax}px`,
    );
    expect(breakpointsCss).toContain(
      `--bp-compact-max: ${BREAKPOINTS.compactMax}px`,
    );
    expect(breakpointsCss).toContain(
      `--bp-tablet-max: ${BREAKPOINTS.tabletMax}px`,
    );
    expect(breakpointsCss).toContain(
      `--bp-desktop-min: ${BREAKPOINTS.desktopMin}px`,
    );
    expect(breakpointsCss).toContain(
      `--bp-phone-landscape-max-height: ${BREAKPOINTS.phoneLandscapeMaxHeight}px`,
    );
  });

  it('should define foldable viewport-segment padding rules', () => {
    expect(cssContent).toMatch(
      /@media\s*\(\s*horizontal-viewport-segments:\s*2\s*\)/,
    );
  });
});

describe('isPhoneLandscapeBlocked', () => {
  const mockMatchMedia = (matchesFor: (query: string) => boolean) => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: matchesFor(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  it('should detect blocked phone landscape via shared media query', async () => {
    const { isPhoneLandscapeBlocked } = await import('./layout/breakpoints');

    mockMatchMedia((query) => query === PHONE_LANDSCAPE_BLOCK_MEDIA);
    expect(isPhoneLandscapeBlocked()).toBe(true);
  });

  it('should not block portrait phone or tablet landscape', async () => {
    const { isPhoneLandscapeBlocked } = await import('./layout/breakpoints');

    mockMatchMedia(() => false);
    expect(isPhoneLandscapeBlocked()).toBe(false);
  });
});

describe('resolveLayoutTier', () => {
  const mockMatchMedia = (matchesFor: (query: string) => boolean) => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: matchesFor(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  it('should classify narrow portrait touch viewports as phone', async () => {
    const { resolveLayoutTier } = await import('./layout/breakpoints');

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    mockMatchMedia(
      (query) =>
        query === '(pointer: coarse)' || query === '(orientation: portrait)',
    );

    expect(resolveLayoutTier()).toBe('phone');
  });

  it('should classify touch landscape tablets as tablet', async () => {
    const { resolveLayoutTier } = await import('./layout/breakpoints');

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });
    mockMatchMedia((query) => query === '(pointer: coarse)');

    expect(resolveLayoutTier()).toBe('tablet');
  });
});

describe('layout hook initial state', () => {
  const mockMatchMedia = (matchesFor: (query: string) => boolean) => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: matchesFor(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  it('useLayoutTier should read phone tier synchronously on first render', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    mockMatchMedia(
      (query) =>
        query === '(pointer: coarse)' || query === '(orientation: portrait)',
    );

    const { result } = renderHook(() => useLayoutTier());
    expect(result.current).toBe('phone');
  });

  it('usePhoneLandscapeBlocked should read blocked state synchronously on first render', () => {
    mockMatchMedia((query) => query === PHONE_LANDSCAPE_BLOCK_MEDIA);

    const { result } = renderHook(() => usePhoneLandscapeBlocked());
    expect(result.current).toBe(true);
  });
});
