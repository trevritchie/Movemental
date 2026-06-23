import React from 'react';
import { useChordContext } from '../../context/ChordContext';

export const VoiceLeadingToggle: React.FC = () => {
  const { voiceLeadingMode, setVoiceLeadingMode } = useChordContext();

  return (
    <div className="memory-toggle">
      <button
        type="button"
        className={`memory-btn ${voiceLeadingMode === 'smooth' ? 'active' : ''}`}
        onClick={() => setVoiceLeadingMode('smooth')}
        title="Smooth: move to the nearest voicing when changing chords"
      >
        Smooth
      </button>
      <button
        type="button"
        className={`memory-btn ${voiceLeadingMode === 'root_position' ? 'active' : ''}`}
        onClick={() => setVoiceLeadingMode('root_position')}
        title="Default to Root Position: root in bass on each chord change"
      >
        Default to Root Position
      </button>
    </div>
  );
};
