import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportM4a,
  resetSessionAudioExporterForTests,
} from './SessionAudioExporter';
import * as audioPeakMeasure from './audioPeakMeasure';

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

vi.mock('./audioPeakMeasure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./audioPeakMeasure')>();
  return {
    ...actual,
    measureAudioPeakDb: vi.fn(async () => -6),
  };
});

describe('SessionAudioExporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSessionAudioExporterForTests();
    vi.mocked(audioPeakMeasure.measureAudioPeakDb).mockResolvedValue(-6);
  });

  it('returns safe MP4 blobs unchanged after peak scan', async () => {
    const input = new Blob(['m4a'], { type: 'audio/mp4' });

    const output = await exportM4a(input);

    expect(output).toBe(input);
    expect(mockLoad).not.toHaveBeenCalled();
    expect(audioPeakMeasure.measureAudioPeakDb).toHaveBeenCalledWith(input);
  });

  it('transcodes hot MP4 blobs with trim and limiter', async () => {
    vi.mocked(audioPeakMeasure.measureAudioPeakDb).mockResolvedValue(-1);
    const input = new Blob(['m4a'], { type: 'audio/mp4' });

    const output = await exportM4a(input);

    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockExec).toHaveBeenCalledWith([
      '-i',
      'input.m4a',
      '-af',
      'volume=-2dB,alimiter=limit=-3dB:attack=5:release=50',
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

  it('transcodes WebM blobs with export safety limiter', async () => {
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
      '-af',
      'alimiter=limit=-3dB:attack=5:release=50',
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

  it('runs ffmpeg with limiter when peak scan fails', async () => {
    vi.mocked(audioPeakMeasure.measureAudioPeakDb).mockResolvedValue(null);
    const input = new Blob(['m4a'], { type: 'audio/mp4' });

    await exportM4a(input);

    expect(mockExec).toHaveBeenCalledWith([
      '-i',
      'input.m4a',
      '-af',
      'alimiter=limit=-3dB:attack=5:release=50',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      'output.m4a',
    ]);
  });
});
