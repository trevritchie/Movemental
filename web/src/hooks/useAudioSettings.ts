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
  getOutputProfile,
  scaleFxWet,
  type OutputProfileId,
} from '../audio/outputProfiles';
import {
  getSynthPreset,
  SYNTH_PRESETS,
  type SynthPreset,
} from '../audio/synthPresets';
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
  const initialProfileId = readOutputProfileId();
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

  const didSyncOnMount = useRef(false);

  const syncScaledFxToEngine = useCallback(
    (profileId: OutputProfileId, chorus: number, delay: number, reverb: number) => {
      const profile = getOutputProfile(profileId);
      audioEngine.setChorusWet(scaleFxWet(chorus, profile));
      audioEngine.setDelayWet(scaleFxWet(delay, profile));
      audioEngine.setReverbWet(scaleFxWet(reverb, profile));
    },
    [],
  );

  useEffect(() => {
    if (didSyncOnMount.current) {
      return;
    }
    didSyncOnMount.current = true;
    audioEngine.setOutputProfile(getOutputProfile(outputProfileId));
    audioEngine.applyPreset(getSynthPreset(synthPresetId));
    syncScaledFxToEngine(outputProfileId, chorusWet, delayWet, reverbWet);
  }, [
    outputProfileId,
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
    audioEngine.setOutputProfile(getOutputProfile(id));
    syncScaledFxToEngine(id, chorusWet, delayWet, reverbWet);
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
    syncScaledFxToEngine(outputProfileId, val, delayWet, reverbWet);
  };

  const setDelayWet = (val: number) => {
    setDelayWetState(val);
    syncScaledFxToEngine(outputProfileId, chorusWet, val, reverbWet);
  };

  const setReverbWet = (val: number) => {
    setReverbWetState(val);
    syncScaledFxToEngine(outputProfileId, chorusWet, delayWet, val);
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
