import React from 'react';
import { useChordContext } from '../../context/ChordContext';

export const HarmonicFunctionLabelsToggle: React.FC = () => {
  const {
    harmonicFunctionLabelsEnabled,
    setHarmonicFunctionLabelsEnabled,
  } = useChordContext();

  return (
    <div className="harmonic-function-labels-toggle">
      <div className="memory-toggle">
        <button
          type="button"
          className={`memory-btn ${!harmonicFunctionLabelsEnabled ? 'active' : ''}`}
          onClick={() => setHarmonicFunctionLabelsEnabled(false)}
          aria-pressed={!harmonicFunctionLabelsEnabled}
        >
          Off
        </button>
        <button
          type="button"
          className={`memory-btn ${harmonicFunctionLabelsEnabled ? 'active' : ''}`}
          onClick={() => setHarmonicFunctionLabelsEnabled(true)}
          aria-pressed={harmonicFunctionLabelsEnabled}
        >
          On
        </button>
      </div>
    </div>
  );
};
