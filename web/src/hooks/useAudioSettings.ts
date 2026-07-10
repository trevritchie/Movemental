/**
 * Effect wet/dry, envelope, EQ profile, and instrument preset settings synced to AudioEngine.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  isSamplerPreset,
  SYNTH_PRESETS,
  type PresetEnvelopeSettings,
  type SynthPreset,
} from '../audio/synthPresets';
import { resolveLayoutTier } from '../layout/breakpoints';
import { useLayoutTier } from './useLayoutTier';
import type { PlayStyle } from '../context/types';
import {
  getDefaultSoundDesignSettings,
  type SoundDesignSettings,
} from '../settings/userSettingsSchema';

const SAMPLER_DRY_FX = { chorusWet: 0, delayWet: 0, reverbWet: 0 };

function applyPresetDefaultsToState(preset: SynthPreset) {
  const defaults = {
    fx: getPresetFxDefaults(preset),
    clickHold: getPresetClickHoldEnvelope(preset),
    drone: getPresetDroneEnvelope(preset),
  };
  if (isSamplerPreset(preset)) {
    defaults.fx = { ...SAMPLER_DRY_FX };
  }
  return defaults;
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

function resolveInitialSoundDesign(
  initial: Partial<SoundDesignSettings>,
  hasPersistedSettings: boolean,
): SoundDesignSettings {
  const fallback = getDefaultSoundDesignSettings();
  if (!hasPersistedSettings) {
    return {
      ...fallback,
      eqProfileId: readEqProfileId(resolveLayoutTier()),
    };
  }
  return { ...fallback, ...initial };
}

export function useAudioSettings(
  playStyle: PlayStyle,
  initial: Partial<SoundDesignSettings> = {},
  hasPersistedSettings = false,
) {
  const layoutTier = useLayoutTier();
  const soundDesign = resolveInitialSoundDesign(initial, hasPersistedSettings);
  const initialPreset = getSynthPreset(soundDesign.synthPresetId);
  const initialDefaults = applyPresetDefaultsToState(initialPreset);

  const [eqProfileId, setEqProfileIdState] = useState<EqProfileId>(
    () => soundDesign.eqProfileId,
  );
  const [synthPresetId, setSynthPresetIdState] = useState<string>(
    () => soundDesign.synthPresetId,
  );
  const [synthPresetLoading, setSynthPresetLoading] = useState(false);

  const [chorusWet, setChorusWetState] = useState(soundDesign.chorusWet);
  const [delayWet, setDelayWetState] = useState(soundDesign.delayWet);
  const [reverbWet, setReverbWetState] = useState(soundDesign.reverbWet);

  const [envelopeAttack, setEnvelopeAttackState] = useState(
    soundDesign.envelopeAttack,
  );
  const [envelopeDecay, setEnvelopeDecayState] = useState(
    soundDesign.envelopeDecay,
  );
  const [envelopeSustain, setEnvelopeSustainState] = useState(
    soundDesign.envelopeSustain,
  );
  const [envelopeRelease, setEnvelopeReleaseState] = useState(
    soundDesign.envelopeRelease,
  );

  const [droneAttack, setDroneAttackState] = useState(soundDesign.droneAttack);
  const [droneDecay, setDroneDecayState] = useState(soundDesign.droneDecay);
  const [droneSustain, setDroneSustainState] = useState(soundDesign.droneSustain);
  const [droneRelease, setDroneReleaseState] = useState(soundDesign.droneRelease);

  const clickHoldCurvesRef = useRef<PresetEnvelopeSettings>(
    initialDefaults.clickHold,
  );
  const droneCurvesRef = useRef<PresetEnvelopeSettings>(initialDefaults.drone);

  const didSyncPresetOnMount = useRef(false);

  const isSamplerInstrumentActive = useMemo(
    () => isSamplerPreset(getSynthPreset(synthPresetId)),
    [synthPresetId],
  );

  const isSamplerAdsrDisabled = useMemo(
    () => isSamplerInstrumentActive && playStyle === 'drone',
    [isSamplerInstrumentActive, playStyle],
  );

  useEffect(() => {
    audioEngine.setSamplerNaturalEnvelope(isSamplerAdsrDisabled);
  }, [isSamplerAdsrDisabled]);

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
    void (async () => {
      if (!didSyncPresetOnMount.current) {
        didSyncPresetOnMount.current = true;
        const preset = getSynthPreset(synthPresetId);
        if (isSamplerPreset(preset)) {
          setSynthPresetLoading(true);
        }
        try {
          await audioEngine.applyPreset(preset);
        } finally {
          setSynthPresetLoading(false);
        }
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
    })();
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
    if (isSamplerAdsrDisabled) {
      return;
    }
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
    isSamplerAdsrDisabled,
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

    setEnvelopeAttackState(defaults.clickHold.attack);
    setEnvelopeDecayState(defaults.clickHold.decay);
    setEnvelopeSustainState(defaults.clickHold.sustain);
    setEnvelopeReleaseState(defaults.clickHold.release);
    setDroneAttackState(defaults.drone.attack);
    setDroneDecayState(defaults.drone.decay);
    setDroneSustainState(defaults.drone.sustain);
    setDroneReleaseState(defaults.drone.release);

    if (playStyle === 'drone' && !isSamplerPreset(preset)) {
      audioEngine.applyEnvelopeSettings(defaults.drone);
    } else if (playStyle !== 'drone') {
      audioEngine.applyEnvelopeSettings(defaults.clickHold);
    }

    if (isSamplerPreset(preset)) {
      setSynthPresetLoading(true);
    }

    void (async () => {
      try {
        await audioEngine.applyPreset(preset);
      } catch {
        setSynthPresetIdState(audioEngine.getSynthPresetId());
        return;
      } finally {
        setSynthPresetLoading(false);
      }
    })();
  };

  const setChorusWet = (val: number) => {
    if (isSamplerInstrumentActive) {
      return;
    }
    setChorusWetState(val);
    syncScaledFxToEngine(eqProfileId, layoutTier, val, delayWet, reverbWet);
  };

  const setDelayWet = (val: number) => {
    if (isSamplerInstrumentActive) {
      return;
    }
    setDelayWetState(val);
    syncScaledFxToEngine(eqProfileId, layoutTier, chorusWet, val, reverbWet);
  };

  const setReverbWet = (val: number) => {
    if (isSamplerInstrumentActive) {
      return;
    }
    setReverbWetState(val);
    syncScaledFxToEngine(eqProfileId, layoutTier, chorusWet, delayWet, val);
  };

  const setEnvelopeAttack = (val: number) => {
    if (isSamplerAdsrDisabled) {
      return;
    }
    setEnvelopeAttackState(val);
  };

  const setEnvelopeDecay = (val: number) => {
    if (isSamplerAdsrDisabled) {
      return;
    }
    setEnvelopeDecayState(val);
  };

  const setEnvelopeSustain = (val: number) => {
    if (isSamplerAdsrDisabled) {
      return;
    }
    setEnvelopeSustainState(val);
  };

  const setEnvelopeRelease = (val: number) => {
    if (isSamplerAdsrDisabled) {
      return;
    }
    setEnvelopeReleaseState(val);
  };

  const setDroneAttack = (val: number) => {
    if (isSamplerAdsrDisabled) {
      return;
    }
    setDroneAttackState(val);
  };

  const setDroneDecay = (val: number) => {
    if (isSamplerAdsrDisabled) {
      return;
    }
    setDroneDecayState(val);
  };

  const setDroneSustain = (val: number) => {
    if (isSamplerAdsrDisabled) {
      return;
    }
    setDroneSustainState(val);
  };

  const setDroneRelease = (val: number) => {
    if (isSamplerAdsrDisabled) {
      return;
    }
    setDroneReleaseState(val);
  };

  return {
    eqProfileId,
    setEqProfileId,
    synthPresetId,
    setSynthPresetId,
    synthPresetLoading,
    isSamplerInstrumentActive,
    isSamplerAdsrDisabled,
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
