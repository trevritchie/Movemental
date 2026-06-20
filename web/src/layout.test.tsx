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

  it('should use a 3-column mobile voice panel grid with action buttons', () => {
    const phoneStart = cssContent.search(phoneLayoutPattern);
    const phoneBlock = cssContent.slice(phoneStart, phoneStart + 5000);
    expect(phoneBlock).toMatch(/\.mobile-voice-grid\s*\{/);
    expect(phoneBlock).toMatch(/grid-template-columns:\s*auto 1fr auto/);
    expect(phoneBlock).toMatch(/\.mobile-action-column\s*\{/);
    expect(phoneBlock).toMatch(/\.mobile-action-buttons\s*\{/);
    expect(phoneBlock).toMatch(
      /\.mobile-voice-slider-cell[\s\S]*justify-content:\s*center/,
    );
    expect(phoneBlock).not.toMatch(/\.mobile-voice-lock-cell/);
    expect(phoneBlock).not.toMatch(/\.mobile-top-toolbar/);
  });

  it('should use fluid Gemini-style diagram overlay pills on mobile', () => {
    expect(cssContent).toMatch(/\.diagram-overlay-pill\s*\{/);
    expect(cssContent).toMatch(
      /\.diagram-overlay-pill--bottom-left[\s\S]*width:\s*max-content/,
    );
    expect(cssContent).toMatch(
      /max-width:\s*var\(--overlay-corner-max-w/,
    );
    expect(cssContent).not.toMatch(/width:\s*110px/);
    expect(cssContent).not.toMatch(/\.diagram-overlay-pill\.clock-pill/);
  });

  it('should anchor voicing and position pills to top corners', () => {
    expect(cssContent).toMatch(
      /\.diagram-overlay-pill--top-left\s*\{[^}]*left:/,
    );
    expect(cssContent).toMatch(
      /\.diagram-overlay-pill--top-right\s*\{[^}]*right:/,
    );
    expect(cssContent).not.toMatch(/\.diagram-voicing-overlay__top-row/);
  });

  it('should center overlay pill text', () => {
    expect(cssContent).toMatch(
      /\.diagram-overlay-pill\s*\{[^}]*text-align:\s*center/,
    );
    expect(cssContent).toMatch(/\.diagram-overlay-pill__sizer--block/);
    expect(cssContent).toMatch(
      /\(max-width: 767px\)[\s\S]*?\.diagram-container\s*\{[^}]*--overlay-inset-x:\s*2px/,
    );
  });

  it('should use a plain centered chord readout on mobile without a pill', () => {
    expect(cssContent).toMatch(/\.diagram-chord-readout\s*\{/);
    expect(cssContent).toMatch(
      /\.diagram-chord-readout[\s\S]*background:\s*none/,
    );
    expect(cssContent).toMatch(
      /\.clock-container\.mobile-overlay \.clock-info[\s\S]*text-align:\s*center/,
    );
    expect(cssContent).toMatch(
      /\.diagram-chord-readout__sizer[\s\S]*visibility:\s*hidden/,
    );
  });

  it('should define diagram corner actions and bottom-right overlay positioning', () => {
    expect(cssContent).toMatch(/\.diagram-corner-actions\s*\{/);
    expect(cssContent).toMatch(/\.diagram-corner-actions--bottom-left\s*\{/);
    expect(cssContent).toMatch(/\.diagram-corner-actions--bottom-right\s*\{/);
    expect(cssContent).toMatch(
      /\.diagram-overlay-pill--bottom-right\s*\{[^}]*right:/,
    );
    expect(cssContent).toMatch(/\.diagram-toolbar-btn\s*\{/);
    expect(cssContent).not.toMatch(/\.top-bar\s*\{/);
  });

  it('should lock document scroll at the root level', () => {
    expect(cssContent).toMatch(/html\s*\{[^}]*overflow:\s*hidden/);
    expect(cssContent).toMatch(/body\s*\{[^}]*overflow:\s*hidden/);
  });

  it('should use a centered settings modal on all tiers', () => {
    expect(cssContent).toMatch(/\.settings-modal-backdrop[\s\S]*align-items:\s*center/);
    expect(cssContent).toMatch(/\.settings-modal[\s\S]*border-radius:\s*16px/);
    expect(cssContent).toMatch(/\.settings-modal[\s\S]*max-width:\s*420px/);
    expect(cssContent).not.toMatch(/\.settings-menu-sheet__handle/);
  });

  it('should flatten diagram container on phone after base panel styles', () => {
    const baseDiagram = cssContent.match(
      /\.diagram-container\s*\{[^}]*border-radius:\s*16px/,
    );
    expect(baseDiagram, 'Base diagram-container border-radius').not.toBeNull();

    const afterBase = cssContent.slice(
      cssContent.indexOf(baseDiagram![0]) + baseDiagram![0].length,
    );
    expect(afterBase).toMatch(
      /@media[^}]*767px[^}]*\{[\s\S]*?\.diagram-container\s*\{[^}]*border-radius:\s*0/,
    );
  });

  it('should ensure accessible touch targets in the mobile voice panel grid', () => {
    const phoneStart = cssContent.search(phoneLayoutPattern);
    const phoneBlock = cssContent.slice(phoneStart, phoneStart + 5000);
    expect(phoneBlock).toMatch(
      /grid-template-rows:\s*repeat\(4,\s*minmax\(44px/,
    );
    expect(phoneBlock).toMatch(/\.mobile-toolbar-btn\s*\{/);
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
