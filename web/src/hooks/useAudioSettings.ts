/**
 * Effect wet/dry and envelope settings synced to AudioEngine.
 */
import { useState, useEffect } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import type { PlayStyle } from '../context/types';

export function useAudioSettings(playStyle: PlayStyle) {
  const [chorusWet, setChorusWetState] = useState(0.35);
  const [delayWet, setDelayWetState] = useState(0.0);
  const [reverbWet, setReverbWetState] = useState(0.30);

  const [envelopeAttack, setEnvelopeAttack] = useState(0.15);
  const [envelopeDecay, setEnvelopeDecay] = useState(2.0);
  const [envelopeSustain, setEnvelopeSustain] = useState(0.5);
  const [envelopeRelease, setEnvelopeRelease] = useState(2.5);

  const [droneAttack, setDroneAttack] = useState(0.6);
  const [droneDecay, setDroneDecay] = useState(3.5);
  const [droneSustain, setDroneSustain] = useState(0.2);
  const [droneRelease, setDroneRelease] = useState(0.50);

  useEffect(() => {
    // The tilt style drones, so it shares the drone envelope.
    if (playStyle === 'drone' || playStyle === 'tilt') {
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

  const setChorusWet = (val: number) => {
    setChorusWetState(val);
    audioEngine.setChorusWet(val);
  };

  const setDelayWet = (val: number) => {
    setDelayWetState(val);
    audioEngine.setDelayWet(val);
  };

  const setReverbWet = (val: number) => {
    setReverbWetState(val);
    audioEngine.setReverbWet(val);
  };

  return {
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
