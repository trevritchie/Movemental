/**
 * Orchestral-style groupings for sampled instrument presets in settings UI.
 */
import type { SynthPreset } from './synthPresets';

export type SamplerInstrumentCategoryId =
  | 'keyboard'
  | 'strings'
  | 'woodwinds'
  | 'brass'
  | 'percussion'
  | 'other';

export interface SamplerInstrumentCategory {
  id: SamplerInstrumentCategoryId;
  label: string;
  presetIds: readonly string[];
}

/** Display order inside the Sampled instrument section. */
export const SAMPLER_INSTRUMENT_CATEGORIES: readonly SamplerInstrumentCategory[] =
  [
    {
      id: 'keyboard',
      label: 'Keyboards',
      presetIds: ['grandPiano', 'piano', 'organ', 'harmonium'],
    },
    {
      id: 'strings',
      label: 'Strings',
      presetIds: [
        'violin',
        'cello',
        'harp',
        'guitar-nylon',
        'guitar-acoustic',
        'guitar-electric',
      ],
    },
    {
      id: 'woodwinds',
      label: 'Woodwinds',
      presetIds: ['flute', 'clarinet', 'bassoon', 'saxophone'],
    },
    {
      id: 'brass',
      label: 'Brass',
      presetIds: ['trumpet', 'trombone', 'french-horn', 'tuba'],
    },
    {
      id: 'percussion',
      label: 'Percussion',
      presetIds: ['xylophone'],
    },
  ];

export interface SamplerPresetCategoryGroup {
  category: SamplerInstrumentCategory;
  presets: SynthPreset[];
}

export function groupSamplerPresetsByCategory(
  presets: SynthPreset[],
): SamplerPresetCategoryGroup[] {
  const byId = new Map(presets.map((preset) => [preset.id, preset]));
  const categorized = new Set<string>();

  const groups = SAMPLER_INSTRUMENT_CATEGORIES.map((category) => {
    const categoryPresets = category.presetIds
      .map((id) => byId.get(id))
      .filter((preset): preset is SynthPreset => preset != null);

    for (const preset of categoryPresets) {
      categorized.add(preset.id);
    }

    return { category, presets: categoryPresets };
  }).filter((group) => group.presets.length > 0);

  const uncategorized = presets.filter((preset) => !categorized.has(preset.id));
  if (uncategorized.length > 0) {
    groups.push({
      category: {
        id: 'other',
        label: 'Other',
        presetIds: uncategorized.map((preset) => preset.id),
      },
      presets: uncategorized,
    });
  }

  return groups;
}
