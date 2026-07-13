import { describe, expect, it } from 'vitest';
import {
  EXPORT_SAFE_PEAK_DB,
  exportTrimDbForPeak,
  isExportPeakSafe,
} from './audioPeakMeasure';

describe('audioPeakMeasure', () => {
  it('treats peaks at or below the export ceiling as safe', () => {
    expect(isExportPeakSafe(-3)).toBe(true);
    expect(isExportPeakSafe(-6)).toBe(true);
    expect(isExportPeakSafe(-2)).toBe(false);
    expect(isExportPeakSafe(null)).toBe(false);
  });

  it('computes trim only for hot peaks', () => {
    expect(exportTrimDbForPeak(-6)).toBe(0);
    expect(exportTrimDbForPeak(EXPORT_SAFE_PEAK_DB)).toBe(0);
    expect(exportTrimDbForPeak(-1)).toBeCloseTo(-2, 5);
    expect(exportTrimDbForPeak(0)).toBe(-3);
  });
});
