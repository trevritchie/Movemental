/**
 * Effect wet/dry, envelope, output profile, and instrument preset settings synced to AudioEngine.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import {
  readOutputProfileId,
  readSynthPresetId,
  writeOutputProfileId,
  writeSynthPresetId,
} from '../audio/audioSettingsStorage';
import {
  getAdaptedOutputProfile,
  scaleFxWet,
  type OutputProfileId,
} from '../audio/outputProfiles';
import {
  getSynthPreset,
  SYNTH_PRESETS,
  type SynthPreset,
} from '../audio/synthPresets';
import { resolveLayoutTier } from '../layout/breakpoints';
import { useLayoutTier } from './useLayoutTier';
import type { PlayStyle } from '../context/types';

function applyPresetDefaultsToState(preset: SynthPreset) {
  const fx = preset.fxDefaults ?? {
    chorusWet: 0.35,
    delayWet: 0.0,
    reverbWet: 0.3,
  };
  const clickHold = preset.envelopeDefaults?.clickHold ?? {
    attack: 0.15,
    decay: 2.0,
    sustain: 0.5,
    release: 2.5,
  };
  const drone = preset.envelopeDefaults?.drone ?? {
    attack: 0.6,
    decay: 3.5,
    sustain: 0.2,
    release: 0.5,
  };
  return { fx, clickHold, drone };
}

export function useAudioSettings(playStyle: PlayStyle) {
  const layoutTier = useLayoutTier();
  const initialProfileId = readOutputProfileId(resolveLayoutTier());
  const initialPreset = getSynthPreset(readSynthPresetId());
  const initialDefaults = applyPresetDefaultsToState(initialPreset);

  const [outputProfileId, setOutputProfileIdState] = useState<OutputProfileId>(
    () => initialProfileId,
  );
  const [synthPresetId, setSynthPresetIdState] = useState<string>(
    () => readSynthPresetId(),
  );

  const [chorusWet, setChorusWetState] = useState(initialDefaults.fx.chorusWet);
  const [delayWet, setDelayWetState] = useState(initialDefaults.fx.delayWet);
  const [reverbWet, setReverbWetState] = useState(initialDefaults.fx.reverbWet);

  const [envelopeAttack, setEnvelopeAttack] = useState(
    initialDefaults.clickHold.attack,
  );
  const [envelopeDecay, setEnvelopeDecay] = useState(
    initialDefaults.clickHold.decay,
  );
  const [envelopeSustain, setEnvelopeSustain] = useState(
    initialDefaults.clickHold.sustain,
  );
  const [envelopeRelease, setEnvelopeRelease] = useState(
    initialDefaults.clickHold.release,
  );

  const [droneAttack, setDroneAttack] = useState(initialDefaults.drone.attack);
  const [droneDecay, setDroneDecay] = useState(initialDefaults.drone.decay);
  const [droneSustain, setDroneSustain] = useState(initialDefaults.drone.sustain);
  const [droneRelease, setDroneRelease] = useState(initialDefaults.drone.release);

  const didSyncPresetOnMount = useRef(false);

  const syncScaledFxToEngine = useCallback(
    (
      profileId: OutputProfileId,
      tier: typeof layoutTier,
      chorus: number,
      delay: number,
      reverb: number,
    ) => {
      const profile = getAdaptedOutputProfile(profileId, tier);
      audioEngine.setChorusWet(scaleFxWet(chorus, profile));
      audioEngine.setDelayWet(scaleFxWet(delay, profile));
      audioEngine.setReverbWet(scaleFxWet(reverb, profile));
    },
    [],
  );

  useEffect(() => {
    if (!didSyncPresetOnMount.current) {
      didSyncPresetOnMount.current = true;
      audioEngine.applyPreset(getSynthPreset(synthPresetId));
    }
    audioEngine.setOutputProfile(
      getAdaptedOutputProfile(outputProfileId, layoutTier),
    );
    syncScaledFxToEngine(
      outputProfileId,
      layoutTier,
      chorusWet,
      delayWet,
      reverbWet,
    );
  }, [
    outputProfileId,
    layoutTier,
    synthPresetId,
    chorusWet,
    delayWet,
    reverbWet,
    syncScaledFxToEngine,
  ]);

  useEffect(() => {
    // The tilt style drones, so it shares the drone envelope.
    if (playStyle === 'drone') {
      audioEngine.setEnvelope(droneAttack, droneDecay, droneSustain, droneRelease);
    } else {
      audioEngine.setEnvelope(
        envelopeAttack,
        envelopeDecay,
        envelopeSustain,
        envelopeRelease
      );
    }
  }, [
    playStyle,
    envelopeAttack,
    envelopeDecay,
    envelopeSustain,
    envelopeRelease,
    droneAttack,
    droneDecay,
    droneSustain,
    droneRelease,
  ]);

  const setOutputProfileId = (id: OutputProfileId) => {
    setOutputProfileIdState(id);
    writeOutputProfileId(id);
  };

  const setSynthPresetId = (id: string) => {
    const preset = getSynthPreset(id);
    const defaults = applyPresetDefaultsToState(preset);

    setSynthPresetIdState(id);
    writeSynthPresetId(id);
    audioEngine.applyPreset(preset);

    setChorusWetState(defaults.fx.chorusWet);
    setDelayWetState(defaults.fx.delayWet);
    setReverbWetState(defaults.fx.reverbWet);
    syncScaledFxToEngine(
      outputProfileId,
      layoutTier,
      defaults.fx.chorusWet,
      defaults.fx.delayWet,
      defaults.fx.reverbWet,
    );

    setEnvelopeAttack(defaults.clickHold.attack);
    setEnvelopeDecay(defaults.clickHold.decay);
    setEnvelopeSustain(defaults.clickHold.sustain);
    setEnvelopeRelease(defaults.clickHold.release);
    setDroneAttack(defaults.drone.attack);
    setDroneDecay(defaults.drone.decay);
    setDroneSustain(defaults.drone.sustain);
    setDroneRelease(defaults.drone.release);
  };

  const setChorusWet = (val: number) => {
    setChorusWetState(val);
    syncScaledFxToEngine(outputProfileId, layoutTier, val, delayWet, reverbWet);
  };

  const setDelayWet = (val: number) => {
    setDelayWetState(val);
    syncScaledFxToEngine(outputProfileId, layoutTier, chorusWet, val, reverbWet);
  };

  const setReverbWet = (val: number) => {
    setReverbWetState(val);
    syncScaledFxToEngine(outputProfileId, layoutTier, chorusWet, delayWet, val);
  };

  return {
    outputProfileId,
    setOutputProfileId,
    synthPresetId,
    setSynthPresetId,
    synthPresets: SYNTH_PRESETS,
    chorusWet,
    setChorusWet,
    delayWet,
    setDelayWet,
    reverbWet,
    setReverbWet,
    envelopeAttack,
    setEnvelopeAttack,
    envelopeDecay,
    setEnvelopeDecay,
    envelopeSustain,
    setEnvelopeSustain,
    envelopeRelease,
    setEnvelopeRelease,
    droneAttack,
    setDroneAttack,
    droneDecay,
    setDroneDecay,
    droneSustain,
    setDroneSustain,
    droneRelease,
    setDroneRelease,
  };
}
