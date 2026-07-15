/// <reference types="node" />
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}));

import { Capacitor } from '@capacitor/core';
import { isNativeApp, getNativePlatform } from './nativePlatform';

describe('nativePlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports web when Capacitor sees a browser context', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');

    expect(isNativeApp()).toBe(false);
    expect(getNativePlatform()).toBe('web');
  });

  it('reports native when Capacitor sees the iOS shell', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');

    expect(isNativeApp()).toBe(true);
    expect(getNativePlatform()).toBe('ios');
  });
});
