/// <reference types="node" />
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { BREAKPOINTS, PHONE_LANDSCAPE_BLOCK_MEDIA } from './layout/breakpoints';
import { LayoutTierProvider, useLayoutTier } from './hooks/useLayoutTier';
import { usePhoneLandscapeBlocked } from './hooks/usePhoneLandscapeBlocked';

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

describe('Responsive Layout CSS', () => {
  const cssPath = path.resolve(process.cwd(), 'src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const breakpointsCssPath = path.resolve(
    process.cwd(),
    'src/layout/breakpoints.css',
  );
  const breakpointsCss = fs.readFileSync(breakpointsCssPath, 'utf-8');

  const phoneLayoutPattern =
    /\(max-width:\s*767px\)[\s\S]*?\(\s*orientation:\s*portrait\s*\)\s*and\s*\(\s*pointer:\s*coarse\s*\)/;

  // Slice the combined mobile media-query block for focused assertions.
  function phoneLayoutBlock(maxLength = 2500): string {
    const phoneStart = cssContent.search(phoneLayoutPattern);
    return cssContent.slice(phoneStart, phoneStart + maxLength);
  }

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

    const phoneBlock = phoneLayoutBlock();
    expect(phoneBlock).toMatch(/html,\s*body[\s\S]*overflow:\s*hidden/);
    expect(phoneBlock).toMatch(/overscroll-behavior:\s*none/);
    expect(phoneBlock).toMatch(/position:\s*fixed/);
  });

  it('should disable text selection and touch callouts on mobile shell', () => {
    const phoneBlock = phoneLayoutBlock();

    expect(phoneBlock).toMatch(/-webkit-touch-callout:\s*none/);
    expect(phoneBlock).toMatch(/user-select:\s*none/);
    expect(phoneBlock).toMatch(/input[\s\S]*user-select:\s*text/);
  });

  it('should harden diagram play surface against mobile browser gestures', () => {
    const diagramSection = cssContent.match(
      /Diagram container[\s\S]*?\.diagram-container \.diagram-svg text[\s\S]*?\}/
    )?.[0];
    expect(diagramSection).toBeTruthy();
    expect(diagramSection).toMatch(/touch-action:\s*none/);
    expect(diagramSection).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
    expect(diagramSection).toMatch(/user-select:\s*none/);
    expect(diagramSection).toMatch(/pointer-events:\s*none/);
  });

  it('should use a flanked vertical-slider mobile voice panel', () => {
    const phoneBlock = phoneLayoutBlock(5000);
    expect(phoneBlock).toMatch(/\.mobile-voice-panel\s*\{/);
    expect(phoneBlock).toMatch(/\.mobile-voice-sliders\s*\{/);
    expect(phoneBlock).toMatch(/\.mobile-voice-slider-col\s*\{/);
    expect(phoneBlock).toMatch(/\.mobile-action-column\s*\{/);
    expect(phoneBlock).toMatch(/\.mobile-action-column--left/);
    expect(phoneBlock).toMatch(/\.mobile-action-column--right/);
    expect(phoneBlock).not.toMatch(/\.mobile-voice-grid/);
    expect(phoneBlock).not.toMatch(/\.mobile-voice-label-cell/);
    expect(phoneBlock).not.toMatch(/\.voice-label-container--phone/);
    expect(phoneBlock).toMatch(/\.controls-section[\s\S]*padding:\s*4px/);
    expect(phoneBlock).not.toMatch(/\.mobile-voice-lock-cell/);
    expect(phoneBlock).not.toMatch(/\.mobile-top-toolbar/);
  });

  it('should lay out desktop borrowing controls as a row of vertical sliders', () => {
    expect(cssContent).toMatch(
      /\.borrowing-controls\s*\{[\s\S]*flex-direction:\s*row/,
    );
    expect(cssContent).toMatch(/\.borrowing-slider-col\s*\{/);
  });

  it('should lay out borrow sliders vertically on equal thirds', () => {
    expect(cssContent).toMatch(
      /\.borrow-slider\s*\{[\s\S]*grid-template-rows:\s*repeat\(3,\s*1fr\)/,
    );
    expect(cssContent).toMatch(
      /\.borrow-slider-track\s*\{[\s\S]*top:\s*calc\(100%\s*\/\s*6\)/,
    );
    expect(cssContent).toMatch(
      /\.borrow-slider-track\s*\{[\s\S]*bottom:\s*calc\(100%\s*\/\s*6\)/,
    );
    expect(cssContent).not.toMatch(
      /\.borrow-slider\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*1fr\)/,
    );
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
      /\.clock-container\.mobile-overlay \.clock-svg[\s\S]*var\(--overlay-clock-size/,
    );
    expect(cssContent).toMatch(
      /\.clock-container\.mobile-overlay \.diagram-chord-readout[\s\S]*var\(--overlay-readout-max-w/,
    );
    expect(cssContent).toMatch(
      /\.diagram-overlay-pill[\s\S]*var\(--overlay-pill-padding-y/,
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

  it('should ensure accessible touch targets in the mobile voice panel', () => {
    const phoneBlock = phoneLayoutBlock(5000);
    expect(phoneBlock).toMatch(/\.mobile-toolbar-btn\s*\{/);
    expect(phoneBlock).toMatch(/min-width:\s*48px/);
    expect(phoneBlock).toMatch(/min-height:\s*48px/);
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
      /\(pointer:\s*coarse\)\s*and\s*\(\s*orientation:\s*landscape\s*\)\s*\{[^}]*(?:#root|visibility:\s*hidden)/,
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

  it('should define tablet touch layout for landscape between 768px and 1199px', () => {
    expect(cssContent).toMatch(
      /@media\s*\(\s*min-width:\s*768px\s*\)\s*and\s*\(\s*max-width:\s*1199px\s*\)\s*and\s*\(\s*pointer:\s*coarse\s*\)\s*and\s*\(\s*orientation:\s*landscape\s*\)/,
    );
  });

  it('should hide mobile clock overlay only outside phone layout tier', () => {
    expect(cssContent).toMatch(
      /\.diagram-container:not\(\[data-layout-tier="phone"\]\)\s*\.clock-container\.mobile-overlay[\s\S]*display:\s*none/,
    );
    expect(cssContent).not.toMatch(
      /\(min-width:\s*768px\)\s*and\s*\(\s*max-width:\s*1199px\s*\)\s*and\s*\(\s*pointer:\s*coarse\s*\)\s*\{[\s\S]*?\.clock-container\.mobile-overlay/,
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
    mockMatchMedia(
      (query) =>
        query === '(pointer: coarse)' || query === '(orientation: landscape)',
    );

    expect(resolveLayoutTier()).toBe('tablet');
  });

  it('should classify touch portrait tablets as phone', async () => {
    const { resolveLayoutTier } = await import('./layout/breakpoints');

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });
    mockMatchMedia(
      (query) =>
        query === '(pointer: coarse)' || query === '(orientation: portrait)',
    );

    expect(resolveLayoutTier()).toBe('phone');
  });

  it('should classify iPad Mini portrait width as phone', async () => {
    const { resolveLayoutTier } = await import('./layout/breakpoints');

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 768,
    });
    mockMatchMedia(
      (query) =>
        query === '(pointer: coarse)' || query === '(orientation: portrait)',
    );

    expect(resolveLayoutTier()).toBe('phone');
  });
});

describe('layout hook initial state', () => {
  it('useLayoutTier should read phone tier synchronously on first render', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    mockMatchMedia(
      (query) =>
        query === '(pointer: coarse)' || query === '(orientation: portrait)',
    );

    const { result } = renderHook(() => useLayoutTier(), {
      wrapper: LayoutTierProvider,
    });
    expect(result.current).toBe('phone');
  });

  it('usePhoneLandscapeBlocked should read blocked state synchronously on first render', () => {
    mockMatchMedia((query) => query === PHONE_LANDSCAPE_BLOCK_MEDIA);

    const { result } = renderHook(() => usePhoneLandscapeBlocked());
    expect(result.current).toBe(true);
  });
});
