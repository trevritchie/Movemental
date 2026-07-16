/**
 * Render a gain-staging scenario offline and analyze the output buffer.
 */
import * as Tone from 'tone';
import {
  analyzeAudioBuffer,
  type AudioAnalysisResult,
} from './audioBufferAnalysis';
import { ATTACK_SCHEDULE_OFFSET_SEC } from './busConstants';
import type { GainStagingScenario } from './gainStagingScenarios';
import { buildMasterBusGraph } from './masterBusGraph';
import { getAdaptedOutputProfile } from './outputProfiles';
import {
  getPresetTapAndHoldEnvelope,
  getPresetFxDefaults,
  getSynthPreset,
} from './synthPresets';

export async function renderScenario(
  scenario: GainStagingScenario,
): Promise<AudioAnalysisResult> {
  const preset = getSynthPreset(scenario.presetId);
  const profile = getAdaptedOutputProfile(
    scenario.profileId,
    scenario.layoutTier,
  );
  const fx = getPresetFxDefaults(preset);
  const envelope = getPresetTapAndHoldEnvelope(preset);
  const noteNames = scenario.midiNotes.map((midi) =>
    Tone.Frequency(midi, 'midi').toNote(),
  );

  const toneBuffer = await Tone.Offline(async () => {
    const graph = await buildMasterBusGraph({
      profile,
      preset,
      envelope,
      chorusWet: fx.chorusWet,
      delayWet: fx.delayWet,
      reverbWet: fx.reverbWet,
      connectToDestination: true,
    });
    graph.triggerAttack(noteNames, ATTACK_SCHEDULE_OFFSET_SEC);
  }, scenario.durationSec);

  const audioBuffer = toneBuffer.get() as AudioBuffer;
  return analyzeAudioBuffer(audioBuffer, {
    sustainWindow: scenario.sustainWindow,
    bodyWindow: scenario.bodyWindow,
  });
}
