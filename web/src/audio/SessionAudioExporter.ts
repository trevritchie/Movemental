import { isM4aCompatibleBlob } from './recordingMimeTypes';

/**
 * Lazy WebM/Opus to M4A/AAC transcode for downloads.
 *
 * ffmpeg.wasm (~25 MB) loads only when the user clicks Download .m4a and the
 * session was recorded as WebM (typical on Chrome/Firefox). Safari/iOS
 * recordings are already M4A and skip ffmpeg entirely. The wasm runtime may
 * stay in memory until the tab closes; transcode RAM scales with recording
 * size (input + output in ffmpeg's virtual FS during export).
 */
const FFMPEG_CORE_VERSION = '0.12.6';
const FFMPEG_CDN_BASE =
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

type FfmpegInstance = {
  loaded: boolean;
  load: (config: {
    coreURL: string;
    wasmURL: string;
  }) => Promise<void>;
  writeFile: (name: string, data: Uint8Array) => Promise<void>;
  readFile: (name: string) => Promise<Uint8Array>;
  deleteFile: (name: string) => Promise<void>;
  exec: (args: string[]) => Promise<number>;
};

let ffmpegInstance: FfmpegInstance | null = null;
let loadPromise: Promise<FfmpegInstance> | null = null;

function inputExtensionForBlob(blob: Blob): string {
  const type = blob.type.toLowerCase();
  if (type.includes('webm')) {
    return 'webm';
  }
  if (type.includes('ogg')) {
    return 'ogg';
  }
  if (type.includes('wav')) {
    return 'wav';
  }
  return 'bin';
}

async function ensureFfmpegLoaded(): Promise<FfmpegInstance> {
  if (ffmpegInstance?.loaded) {
    return ffmpegInstance;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ]);

      const ffmpeg = new FFmpeg() as unknown as FfmpegInstance;
      // Single-thread UMD build: no COOP/COEP headers required on the host.
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${FFMPEG_CDN_BASE}/ffmpeg-core.js`,
          'text/javascript',
        ),
        wasmURL: await toBlobURL(
          `${FFMPEG_CDN_BASE}/ffmpeg-core.wasm`,
          'application/wasm',
        ),
      });

      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }

  return loadPromise;
}

/**
 * Export a session recording as M4A/AAC for universal playback (iOS, VLC, WMP).
 * ffmpeg.wasm is lazy-loaded on first non-M4A export.
 */
export async function exportM4a(input: Blob): Promise<Blob> {
  if (isM4aCompatibleBlob(input)) {
    return input;
  }

  const ffmpeg = await ensureFfmpegLoaded();
  const { fetchFile } = await import('@ffmpeg/util');
  const inputName = `input.${inputExtensionForBlob(input)}`;
  const outputName = 'output.m4a';

  await ffmpeg.writeFile(inputName, await fetchFile(input));
  const exitCode = await ffmpeg.exec([
    '-i',
    inputName,
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    // moov at front: progressive playback in Files/VLC/WMP on phone and desktop.
    '-movflags',
    '+faststart',
    outputName,
  ]);

  if (exitCode !== 0) {
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    throw new Error('Failed to transcode recording to M4A');
  }

  const output = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName).catch(() => undefined);
  await ffmpeg.deleteFile(outputName).catch(() => undefined);

  return new Blob([new Uint8Array(output)], { type: 'audio/mp4' });
}

/** Reset cached ffmpeg instance (for unit tests). */
export function resetSessionAudioExporterForTests(): void {
  ffmpegInstance = null;
  loadPromise = null;
}
