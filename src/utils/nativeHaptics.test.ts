/// <reference types="node" />
import { describe, it, expect, vi, beforeEach } from 'vitest';

const hapticsMocks = vi.hoisted(() => ({
  impact: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@capacitor/haptics', () => ({
  ImpactStyle: { Light: 'LIGHT' },
  Haptics: { impact: hapticsMocks.impact },
}));

vi.mock('./nativePlatform', () => ({
  isNativeApp: vi.fn(() => false),
}));

import { isNativeApp } from './nativePlatform';
import { triggerChordCommitHaptic } from './nativeHaptics';

describe('triggerChordCommitHaptic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isNativeApp).mockReturnValue(false);
  });

  it('does nothing in the web channel', () => {
    triggerChordCommitHaptic();
    expect(hapticsMocks.impact).not.toHaveBeenCalled();
  });

  it('fires a light impact inside the native shell', () => {
    vi.mocked(isNativeApp).mockReturnValue(true);
    triggerChordCommitHaptic();
    expect(hapticsMocks.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
  });

  it('swallows haptic plugin failures', () => {
    vi.mocked(isNativeApp).mockReturnValue(true);
    hapticsMocks.impact.mockRejectedValueOnce(new Error('no vibrator'));
    expect(() => triggerChordCommitHaptic()).not.toThrow();
  });
});
