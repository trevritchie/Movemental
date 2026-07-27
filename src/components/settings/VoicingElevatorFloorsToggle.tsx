import React from 'react';
import { useChordContext } from '../../context/ChordContext';

export const VoicingElevatorFloorsToggle: React.FC = () => {
  const { voicingElevatorFloorsMode, setVoicingElevatorFloorsMode } =
    useChordContext();

  return (
    <div className="voicing-elevator-floors-toggle">
      <div className="memory-toggle">
        <button
          type="button"
          className={`memory-btn ${voicingElevatorFloorsMode === 'all' ? 'active' : ''}`}
          onClick={() => setVoicingElevatorFloorsMode('all')}
          aria-pressed={voicingElevatorFloorsMode === 'all'}
        >
          All
        </button>
        <button
          type="button"
          className={`memory-btn ${voicingElevatorFloorsMode === 'every_other' ? 'active' : ''}`}
          onClick={() => setVoicingElevatorFloorsMode('every_other')}
          aria-pressed={voicingElevatorFloorsMode === 'every_other'}
        >
          Every Other
        </button>
      </div>
    </div>
  );
};
