/**
 * Effect wet/dry, envelope, EQ profile, and instrument preset settings synced to AudioEngine.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { readEqProfileId } from '../audio/audioSettingsStorage';
import {
  getAdaptedOutputProfile,
  scaleFxWet,
  type EqProfileId,
} from '../audio/outputProfiles';
import {
  getPresetClickHoldEnvelope,
  getPresetDroneEnvelope,
  getPresetFxDefaults,
  getSynthPreset,
  SYNTH_PRESETS,
  type PresetEnvelopeSettings,
  type SynthPreset,
} from '../audio/synthPresets';
import { resolveLayoutTier } from '../layout/breakpoints';
import { useLayoutTier } from './useLayoutTier';
import type { PlayStyle } from '../context/types';

function applyPresetDefaultsToState(preset: SynthPreset) {
  return {
    fx: getPresetFxDefaults(preset),
    clickHold: getPresetClickHoldEnvelope(preset),
    drone: getPresetDroneEnvelope(preset),
  };
}

function envelopeToEngineSettings(
  values: AdsrFromPreset,
  curves: PresetEnvelopeSettings,
): PresetEnvelopeSettings {
  return {
    attack: values.attack,
    decay: values.decay,
    sustain: values.sustain,
    release: values.release,
    attackCurve: curves.attackCurve,
    decayCurve: curves.decayCurve,
    sustainCurve: curves.sustainCurve,
    releaseCurve: curves.releaseCurve,
  };
}

type AdsrFromPreset = Pick<
  PresetEnvelopeSettings,
  'attack' | 'decay' | 'sustain' | 'release'
>;

export function useAudioSettings(playStyle: PlayStyle) {
  const layoutTier = useLayoutTier();
  const initialProfileId = readEqProfileId(resolveLayoutTier());
  const initialPreset = getSynthPreset('warmPad');
  const initialDefaults = applyPresetDefaultsToState(initialPreset);

  const [eqProfileId, setEqProfileIdState] = useState<EqProfileId>(
    () => initialProfileId,
  );
  const [synthPresetId, setSynthPresetIdState] = useState<string>('warmPad');

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

  const clickHoldCurvesRef = useRef<PresetEnvelopeSettings>(initialDefaults.clickHold);
  const droneCurvesRef = useRef<PresetEnvelopeSettings>(initialDefaults.drone);

  const didSyncPresetOnMount = useRef(false);

  const syncScaledFxToEngine = useCallback(
    (
      profileId: EqProfileId,
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
      getAdaptedOutputProfile(eqProfileId, layoutTier),
    );
    syncScaledFxToEngine(
      eqProfileId,
      layoutTier,
      chorusWet,
      delayWet,
      reverbWet,
    );
  }, [
    eqProfileId,
    layoutTier,
    synthPresetId,
    chorusWet,
    delayWet,
    reverbWet,
    syncScaledFxToEngine,
  ]);

  useEffect(() => {
    if (playStyle === 'drone') {
      audioEngine.applyEnvelopeSettings(
        envelopeToEngineSettings(
          {
            attack: droneAttack,
            decay: droneDecay,
            sustain: droneSustain,
            release: droneRelease,
          },
          droneCurvesRef.current,
        ),
      );
    } else {
      audioEngine.applyEnvelopeSettings(
        envelopeToEngineSettings(
          {
            attack: envelopeAttack,
            decay: envelopeDecay,
            sustain: envelopeSustain,
            release: envelopeRelease,
          },
          clickHoldCurvesRef.current,
        ),
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

  const setEqProfileId = (id: EqProfileId) => {
    setEqProfileIdState(id);
  };

  const setSynthPresetId = (id: string) => {
    const preset = getSynthPreset(id);
    const defaults = applyPresetDefaultsToState(preset);

    clickHoldCurvesRef.current = defaults.clickHold;
    droneCurvesRef.current = defaults.drone;

    setSynthPresetIdState(id);
    audioEngine.applyPreset(preset);

    setChorusWetState(defaults.fx.chorusWet);
    setDelayWetState(defaults.fx.delayWet);
    setReverbWetState(defaults.fx.reverbWet);
    syncScaledFxToEngine(
      eqProfileId,
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

    if (playStyle === 'drone') {
      audioEngine.applyEnvelopeSettings(defaults.drone);
    } else {
      audioEngine.applyEnvelopeSettings(defaults.clickHold);
    }
  };

  const setChorusWet = (val: number) => {
    setChorusWetState(val);
    syncScaledFxToEngine(eqProfileId, layoutTier, val, delayWet, reverbWet);
  };

  const setDelayWet = (val: number) => {
    setDelayWetState(val);
    syncScaledFxToEngine(eqProfileId, layoutTier, chorusWet, val, reverbWet);
  };

  const setReverbWet = (val: number) => {
    setReverbWetState(val);
    syncScaledFxToEngine(eqProfileId, layoutTier, chorusWet, delayWet, val);
  };

  return {
    eqProfileId,
    setEqProfileId,
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
