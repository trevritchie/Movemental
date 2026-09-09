/// <reference types="node" />
import { describe, it, expect, vi, beforeEach } from 'vitest';

const shareMocks = vi.hoisted(() => ({
  writeFile: vi.fn(),
  share: vi.fn(),
  canShare: vi.fn(),
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: shareMocks.writeFile },
}));

vi.mock('@capacitor/share', () => ({
  Share: { share: shareMocks.share, canShare: shareMocks.canShare },
}));

vi.mock('./nativePlatform', () => ({
  isNativeApp: vi.fn(() => false),
}));

import { isNativeApp } from './nativePlatform';
import { shareOrDownloadFile } from './nativeShare';

describe('shareOrDownloadFile', () => {
  const createObjectURL = vi.fn(() => 'blob:mock-url');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isNativeApp).mockReturnValue(false);
    shareMocks.canShare.mockResolvedValue({ value: true });
    shareMocks.writeFile.mockResolvedValue({ uri: 'file://cache/take.m4a' });
    shareMocks.share.mockResolvedValue({});
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  });

  it('uses an anchor download on the web', async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    await shareOrDownloadFile(new Blob(['audio']), 'movemental.m4a');

    expect(clickSpy).toHaveBeenCalled();
    expect(shareMocks.share).not.toHaveBeenCalled();
    expect(shareMocks.writeFile).not.toHaveBeenCalled();
  });

  it('writes to cache and opens the share sheet on native', async () => {
    vi.mocked(isNativeApp).mockReturnValue(true);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    await shareOrDownloadFile(new Blob(['audio']), 'movemental.m4a');

    expect(shareMocks.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'movemental.m4a',
        directory: 'CACHE',
      }),
    );
    expect(shareMocks.share).toHaveBeenCalledWith(
      expect.objectContaining({
        files: ['file://cache/take.m4a'],
        title: 'movemental.m4a',
      }),
    );
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
