import React from 'react';
import { useChordContext } from '../../context/ChordContext';
import {
  MAX_BPM,
  MIN_BPM,
} from '../../settings/userSettingsSchema';

export const BpmSlider: React.FC = () => {
  const { bpm, setBpm } = useChordContext();

  return (
    <div className="effect-slider-group bpm-slider">
      <div className="slider-container">
        <input
          id="settings-bpm-slider"
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          step={1}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          aria-label="BPM"
          aria-valuetext={`${bpm} BPM`}
        />
        <span className="slider-val">{bpm}</span>
      </div>
    </div>
  );
};
