import React from 'react';
import { useChordContext } from '../../context/ChordContext';

export const ClockLayoutToggle: React.FC = () => {
  const { clockLayoutMode, setClockLayoutMode } = useChordContext();

  return (
    <div className="clock-layout-toggle">
      <div className="memory-toggle">
        <button
          type="button"
          className={`memory-btn ${clockLayoutMode === 'chromatic' ? 'active' : ''}`}
          onClick={() => setClockLayoutMode('chromatic')}
          aria-pressed={clockLayoutMode === 'chromatic'}
        >
          Chromatic
        </button>
        <button
          type="button"
          className={`memory-btn ${clockLayoutMode === 'circle_of_fifths' ? 'active' : ''}`}
          onClick={() => setClockLayoutMode('circle_of_fifths')}
          aria-pressed={clockLayoutMode === 'circle_of_fifths'}
        >
          Circle of Fifths
        </button>
      </div>
    </div>
  );
};
