import React from 'react';
import { useChordContext } from '../../context/ChordContext';

export const InstrumentPresetPicker: React.FC = () => {
  const { synthPresetId, setSynthPresetId, synthPresets } = useChordContext();

  return (
    <div className="instrument-preset-picker">
      <div className="instrument-preset-grid">
        {synthPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`instrument-preset-btn ${synthPresetId === preset.id ? 'active' : ''}`}
            onClick={() => setSynthPresetId(preset.id)}
            aria-pressed={synthPresetId === preset.id}
          >
            {preset.name}
          </button>
        ))}
      </div>
      <p className="settings-menu-section__hint">
        Changing instrument resets envelope and effect defaults for that preset.
        You can still tweak them afterward.
      </p>
    </div>
  );
};
