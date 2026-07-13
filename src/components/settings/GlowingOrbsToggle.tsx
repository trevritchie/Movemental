import React from 'react';
import { useChordContext } from '../../context/ChordContext';

export const GlowingOrbsToggle: React.FC = () => {
  const { glowingOrbsEnabled, setGlowingOrbsEnabled } = useChordContext();

  return (
    <div className="glowing-orbs-toggle">
      <div className="memory-toggle">
        <button
          type="button"
          className={`memory-btn ${glowingOrbsEnabled ? 'active' : ''}`}
          onClick={() => setGlowingOrbsEnabled(true)}
          aria-pressed={glowingOrbsEnabled}
        >
          On
        </button>
        <button
          type="button"
          className={`memory-btn ${!glowingOrbsEnabled ? 'active' : ''}`}
          onClick={() => setGlowingOrbsEnabled(false)}
          aria-pressed={!glowingOrbsEnabled}
        >
          Off
        </button>
      </div>
    </div>
  );
};
