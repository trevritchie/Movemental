import React from 'react';
import { useChordContext } from '../../context/ChordContext';

export const TiltToStrumToggle: React.FC = () => {
  const { tiltToStrum, setTiltToStrum } = useChordContext();

  return (
    <div className="tilt-to-strum-toggle">
      <div className="memory-toggle">
        <button
          type="button"
          className={`memory-btn ${!tiltToStrum ? 'active' : ''}`}
          onClick={() => setTiltToStrum(false)}
          aria-pressed={!tiltToStrum}
        >
          Off
        </button>
        <button
          type="button"
          className={`memory-btn ${tiltToStrum ? 'active' : ''}`}
          onClick={() => setTiltToStrum(true)}
          aria-pressed={tiltToStrum}
        >
          On
        </button>
      </div>
    </div>
  );
};
