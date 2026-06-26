import { describe, expect, it } from 'vitest';
import { isInteractiveOverlayControl } from './useSuppressNativeTouchGestures';

describe('isInteractiveOverlayControl', () => {
  it('returns true for buttons inside the diagram', () => {
    document.body.innerHTML = `
      <div class="diagram-container">
        <button type="button">Settings</button>
      </div>
    `;
    const button = document.querySelector('button')!;
    expect(isInteractiveOverlayControl(button)).toBe(true);
  });

  it('returns false for chord play surfaces', () => {
    document.body.innerHTML = `
      <div class="diagram-container">
        <svg><path class="chord-slice" /></svg>
      </div>
    `;
    const path = document.querySelector('path')!;
    expect(isInteractiveOverlayControl(path)).toBe(false);
  });
});
