/**
 * Sound design settings: FX wet/dry mix, EQ profile, instrument preset, and
 * ADSR envelopes. Split out of ChordContext because these values change
 * independently of chord selection, playback, and borrowing state, and are
 * only read by the Settings UI (sound design panel).
 */
import { createContext, useContext } from 'react';
import type { EqProfileId } from '../audio/outputProfiles';
import type { SynthPreset } from '../audio/synthPresets';

export interface SoundDesignContextType {
  chorusWet: number;
  setChorusWet: (val: number) => void;
  delayWet: number;
  setDelayWet: (val: number) => void;
  reverbWet: number;
  setReverbWet: (val: number) => void;
  eqProfileId: EqProfileId;
  setEqProfileId: (id: EqProfileId) => void;
  synthPresetId: string;
  setSynthPresetId: (id: string) => void;
  synthPresetLoading: boolean;
  isSamplerInstrumentActive: boolean;
  isSamplerAdsrDisabled: boolean;
  synthPresets: SynthPreset[];
  envelopeAttack: number;
  setEnvelopeAttack: (val: number) => void;
  envelopeDecay: number;
  setEnvelopeDecay: (val: number) => void;
  envelopeSustain: number;
  setEnvelopeSustain: (val: number) => void;
  envelopeRelease: number;
  setEnvelopeRelease: (val: number) => void;
  droneAttack: number;
  setDroneAttack: (val: number) => void;
  droneDecay: number;
  setDroneDecay: (val: number) => void;
  droneSustain: number;
  setDroneSustain: (val: number) => void;
  droneRelease: number;
  setDroneRelease: (val: number) => void;
}

export const SoundDesignContext = createContext<
  SoundDesignContextType | undefined
>(undefined);

export const useSoundDesignContext = (): SoundDesignContextType => {
  const context = useContext(SoundDesignContext);
  if (!context) {
    throw new Error(
      'useSoundDesignContext must be used within a ChordProvider',
    );
  }
  return context;
};
