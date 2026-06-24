import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportM4a,
  resetSessionAudioExporterForTests,
} from './SessionAudioExporter';

const mockExec = vi.fn(async () => 0);
const mockWriteFile = vi.fn(async () => undefined);
const mockReadFile = vi.fn(async () => new Uint8Array([1, 2, 3, 4]));
const mockDeleteFile = vi.fn(async () => undefined);
const mockLoad = vi.fn(async () => undefined);

vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: vi.fn().mockImplementation(function FFmpeg(this: {
    loaded: boolean;
    load: typeof mockLoad;
    writeFile: typeof mockWriteFile;
    readFile: typeof mockReadFile;
    deleteFile: typeof mockDeleteFile;
    exec: typeof mockExec;
  }) {
    this.loaded = true;
    this.load = mockLoad;
    this.writeFile = mockWriteFile;
    this.readFile = mockReadFile;
    this.deleteFile = mockDeleteFile;
    this.exec = mockExec;
  }),
}));

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn(async (blob: Blob) => new Uint8Array(await blob.arrayBuffer())),
  toBlobURL: vi.fn(async (url: string) => url),
}));

describe('SessionAudioExporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSessionAudioExporterForTests();
  });

  it('returns MP4 blobs unchanged', async () => {
    const input = new Blob(['m4a'], { type: 'audio/mp4' });

    const output = await exportM4a(input);

    expect(output).toBe(input);
    expect(mockLoad).not.toHaveBeenCalled();
  });

  it('transcodes WebM blobs to M4A via ffmpeg', async () => {
    const input = new Blob(['webm'], { type: 'audio/webm' });

    const output = await exportM4a(input);

    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockWriteFile).toHaveBeenCalledWith(
      'input.webm',
      expect.any(Uint8Array),
    );
    expect(mockExec).toHaveBeenCalledWith([
      '-i',
      'input.webm',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      'output.m4a',
    ]);
    expect(output.type).toBe('audio/mp4');
  });
});
