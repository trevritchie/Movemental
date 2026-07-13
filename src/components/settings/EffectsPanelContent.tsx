import React from 'react';
import { useChordContext } from '../../context/ChordContext';

interface EffectsPanelContentProps {
  idPrefix?: string;
  disabled?: boolean;
}

export const EffectsPanelContent: React.FC<EffectsPanelContentProps> = ({
  idPrefix = '',
  disabled: disabledProp,
}) => {
  const {
    chorusWet,
    setChorusWet,
    delayWet,
    setDelayWet,
    reverbWet,
    setReverbWet,
    isSamplerInstrumentActive,
  } = useChordContext();

  const disabled = disabledProp ?? isSamplerInstrumentActive;

  const chorusId = `${idPrefix}chorus-slider`;
  const delayId = `${idPrefix}delay-slider`;
  const reverbId = `${idPrefix}reverb-slider`;

  return (
    <div
      className={`effects-sliders${disabled ? ' effects-sliders--disabled' : ''}`}
    >
      {disabled && (
        <p className="settings-menu-section__hint">
          Synth effects are disabled for sampled instruments.
        </p>
      )}
      <div className="effect-slider-group">
        <label htmlFor={chorusId}>Chorus Intensity</label>
        <div className="slider-container">
          <input
            id={chorusId}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={chorusWet}
            onChange={(e) => setChorusWet(Number(e.target.value))}
            disabled={disabled}
          />
          <span className="slider-val">{Math.round(chorusWet * 100)}%</span>
        </div>
      </div>

      <div className="effect-slider-group">
        <label htmlFor={delayId}>Delay Echo</label>
        <div className="slider-container">
          <input
            id={delayId}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={delayWet}
            onChange={(e) => setDelayWet(Number(e.target.value))}
            disabled={disabled}
          />
          <span className="slider-val">{Math.round(delayWet * 100)}%</span>
        </div>
      </div>

      <div className="effect-slider-group">
        <label htmlFor={reverbId}>Reverb Space</label>
        <div className="slider-container">
          <input
            id={reverbId}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={reverbWet}
            onChange={(e) => setReverbWet(Number(e.target.value))}
            disabled={disabled}
          />
          <span className="slider-val">{Math.round(reverbWet * 100)}%</span>
        </div>
      </div>
    </div>
  );
};
