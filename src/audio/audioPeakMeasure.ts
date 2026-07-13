/**
 * Sample-peak measurement for recorded audio blobs (WebM, M4A, etc.).
 */
import { LIMITER_CEILING_DB } from './outputProfiles';

/** Peak level (dBFS) below which export can skip extra safety processing. */
export const EXPORT_SAFE_PEAK_DB = LIMITER_CEILING_DB;

function linearToDb(linear: number): number {
  if (linear <= 0) {
    return -Infinity;
  }
  return 20 * Math.log10(linear);
}

/**
 * Measure the maximum absolute sample peak across all channels.
 * Returns null when decode is unavailable or fails.
 */
export async function measureAudioPeakDb(blob: Blob): Promise<number | null> {
  if (typeof AudioContext === 'undefined') {
    return null;
  }

  let audioContext: AudioContext | null = null;

  try {
    audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(
      await blob.arrayBuffer(),
    );

    let peakLinear = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const samples = buffer.getChannelData(channel);
      for (let index = 0; index < samples.length; index += 1) {
        const abs = Math.abs(samples[index]!);
        if (abs > peakLinear) {
          peakLinear = abs;
        }
      }
    }

    return linearToDb(peakLinear);
  } catch {
    return null;
  } finally {
    await audioContext?.close().catch(() => undefined);
  }
}

/**
 * Attenuation (dB, negative or zero) to bring a hot peak down to the export ceiling.
 */
export function exportTrimDbForPeak(peakDb: number): number {
  if (!Number.isFinite(peakDb) || peakDb <= EXPORT_SAFE_PEAK_DB) {
    return 0;
  }
  return EXPORT_SAFE_PEAK_DB - peakDb;
}

export function isExportPeakSafe(peakDb: number | null): boolean {
  return peakDb !== null && Number.isFinite(peakDb) && peakDb <= EXPORT_SAFE_PEAK_DB;
}
