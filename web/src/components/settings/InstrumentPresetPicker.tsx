import React from 'react';
import { Check } from 'lucide-react';
import { useChordContext } from '../../context/ChordContext';

export const InstrumentPresetPicker: React.FC = () => {
  const { synthPresetId, setSynthPresetId, synthPresets } = useChordContext();

  return (
    <div className="instrument-preset-picker">
      <div
        className="instrument-preset-grid"
        role="group"
        aria-label="Instrument preset"
      >
        {synthPresets.map((preset) => {
          const isSelected = synthPresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`instrument-preset-btn${isSelected ? ' active' : ''}`}
              onClick={() => setSynthPresetId(preset.id)}
              aria-pressed={isSelected}
            >
              <span className="instrument-preset-btn__label">{preset.name}</span>
              {isSelected && (
                <Check
                  size={15}
                  strokeWidth={2.5}
                  className="instrument-preset-btn__check"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
      <p className="settings-menu-section__hint">
        Changing instrument resets envelope and effect defaults for that preset.
        You can still tweak them afterward.
      </p>
    </div>
  );
};
