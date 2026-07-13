/**
 * One C-major chord scenario per preset for loudness matching.
 */
import { DEFAULT_BODY_WINDOW } from './audioBufferAnalysis';
import {
  DEFAULT_SUSTAIN_WINDOW,
  type GainStagingScenario,
} from './gainStagingScenarios';
import { SYNTH_PRESETS } from './synthPresets';

const C_MAJOR_4 = [60, 64, 67, 72];

export function buildPresetLoudnessScenario(
  presetId: string,
): GainStagingScenario {
  return {
    id: `loudness-${presetId}`,
    presetId,
    profileId: 'smallSpeakers',
    layoutTier: 'phone',
    midiNotes: C_MAJOR_4,
    durationSec: 4,
    sustainWindow: DEFAULT_SUSTAIN_WINDOW,
    bodyWindow: DEFAULT_BODY_WINDOW,
  };
}

export const PRESET_LOUDNESS_SCENARIOS: GainStagingScenario[] =
  SYNTH_PRESETS.map((preset) => buildPresetLoudnessScenario(preset.id));
