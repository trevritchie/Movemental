import {
  exportTrimDbForPeak,
  isExportPeakSafe,
  measureAudioPeakDb,
} from './audioPeakMeasure';
import { isM4aCompatibleBlob } from './recordingMimeTypes';

/**
 * Lazy WebM/Opus to M4A/AAC transcode for downloads.
 *
 * ffmpeg.wasm (~25 MB) loads only when the user clicks Download .m4a and the
 * session was recorded as WebM (typical on Chrome/Firefox). Safari/iOS
 * recordings are already M4A and skip ffmpeg when peak scan confirms headroom.
 * Hot recordings or non-M4A sources run through ffmpeg with trim + limiter.
 */
const FFMPEG_CORE_VERSION = '0.12.6';
const FFMPEG_CDN_BASE =
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;
/** AAC bitrate for M4A download transcodes. */
const AAC_EXPORT_BITRATE = '192k';
/** Brickwall safety net during export (AAC inter-sample peak margin). */
const EXPORT_LIMITER_FILTER = 'alimiter=limit=-3dB:attack=5:release=50';

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
  if (type.includes('mp4') || type.includes('aac')) {
    return 'm4a';
  }
  return 'bin';
}

function buildExportAudioFilter(peakDb: number | null): string | null {
  const trimDb = peakDb !== null ? exportTrimDbForPeak(peakDb) : 0;
  const filters: string[] = [];

  if (trimDb < 0) {
    filters.push(`volume=${trimDb}dB`);
  }
  filters.push(EXPORT_LIMITER_FILTER);

  return filters.length > 0 ? filters.join(',') : null;
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

async function transcodeToM4a(input: Blob, peakDb: number | null): Promise<Blob> {
  const ffmpeg = await ensureFfmpegLoaded();
  const { fetchFile } = await import('@ffmpeg/util');
  const inputName = `input.${inputExtensionForBlob(input)}`;
  const outputName = 'output.m4a';
  const audioFilter = buildExportAudioFilter(peakDb);

  await ffmpeg.writeFile(inputName, await fetchFile(input));

  const args = ['-i', inputName];
  if (audioFilter) {
    args.push('-af', audioFilter);
  }
  args.push(
    '-c:a',
    'aac',
    '-b:a',
    AAC_EXPORT_BITRATE,
    // moov at front: progressive playback in Files/VLC/WMP on phone and desktop.
    '-movflags',
    '+faststart',
    outputName,
  );

  const exitCode = await ffmpeg.exec(args);

  if (exitCode !== 0) {
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    throw new Error('Failed to transcode recording to M4A');
  }

  const output = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName).catch(() => undefined);
  await ffmpeg.deleteFile(outputName).catch(() => undefined);

  return new Blob([new Uint8Array(output)], { type: 'audio/mp4' });
}

/**
 * Export a session recording as M4A/AAC for universal playback (iOS, VLC, WMP).
 * Peak-scans the source; safe native M4A passes through, otherwise ffmpeg applies
 * trim (if needed) and a -3 dB limiter before AAC encode.
 */
export async function exportM4a(input: Blob): Promise<Blob> {
  const peakDb = await measureAudioPeakDb(input);

  if (import.meta.env.DEV && peakDb !== null) {
    console.log('[SessionAudioExporter] Source peak (dBFS):', peakDb.toFixed(1));
  }

  if (isM4aCompatibleBlob(input) && isExportPeakSafe(peakDb)) {
    return input;
  }

  if (import.meta.env.DEV) {
    const trimDb = peakDb !== null ? exportTrimDbForPeak(peakDb) : 0;
    if (trimDb < 0) {
      console.log(
        '[SessionAudioExporter] Applying export trim:',
        trimDb.toFixed(1),
        'dB + limiter',
      );
    } else if (!isM4aCompatibleBlob(input) || peakDb === null) {
      console.log('[SessionAudioExporter] Applying export safety limiter');
    }
  }

  return transcodeToM4a(input, peakDb);
}

/** Reset cached ffmpeg instance (for unit tests). */
export function resetSessionAudioExporterForTests(): void {
  ffmpegInstance = null;
  loadPromise = null;
}
