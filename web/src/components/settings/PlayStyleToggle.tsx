import React from 'react';
import { useChordContext } from '../../context/ChordContext';

export const PlayStyleToggle: React.FC = () => {
  const { playStyle, setPlayStyle } = useChordContext();

  return (
    <div className="memory-toggle">
      <button
        type="button"
        className={`memory-btn ${playStyle === 'drone' ? 'active' : ''}`}
        onClick={() => setPlayStyle('drone')}
        aria-pressed={playStyle === 'drone'}
      >
        Drone
      </button>
      <button
        type="button"
        className={`memory-btn ${playStyle === 'click_and_hold' ? 'active' : ''}`}
        onClick={() => setPlayStyle('click_and_hold')}
        aria-pressed={playStyle === 'click_and_hold'}
      >
        Click & Hold
      </button>
    </div>
  );
};
