import { describe, expect, it } from 'vitest';
import {
  SAMPLER_INSTRUMENT_CATEGORIES,
  groupSamplerPresetsByCategory,
} from './samplerInstrumentCategories';
import { SAMPLER_ENGINE_PRESETS } from './synthPresets';

describe('samplerInstrumentCategories', () => {
  it('assigns every sampled preset to exactly one category', () => {
    const groups = groupSamplerPresetsByCategory(SAMPLER_ENGINE_PRESETS);
    const groupedIds = groups.flatMap((group) =>
      group.presets.map((preset) => preset.id),
    );

    expect(groupedIds).toHaveLength(SAMPLER_ENGINE_PRESETS.length);
    expect(new Set(groupedIds).size).toBe(SAMPLER_ENGINE_PRESETS.length);
    expect(groupedIds.sort()).toEqual(
      SAMPLER_ENGINE_PRESETS.map((preset) => preset.id).sort(),
    );
  });

  it('keeps orchestral category order', () => {
    const groups = groupSamplerPresetsByCategory(SAMPLER_ENGINE_PRESETS);

    expect(groups.map((group) => group.category.id)).toEqual(
      SAMPLER_INSTRUMENT_CATEGORIES.map((category) => category.id),
    );
  });
});
