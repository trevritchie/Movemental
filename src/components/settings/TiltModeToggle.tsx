import React from 'react';
import { useChordContext } from '../../context/ChordContext';
import { useTiltReadoutContextSafe } from '../../context/TiltReadoutContext';

export const TiltModeToggle: React.FC = () => {
  const { tiltModeEnabled, setTiltModeEnabled } = useChordContext();
  const tiltReadout = useTiltReadoutContextSafe();

  const handleEnableTilt = () => {
    void tiltReadout?.requestTiltPermission();
    setTiltModeEnabled(true);
  };

  return (
    <div className="tilt-mode-toggle">
      <div className="memory-toggle">
        <button
          type="button"
          className={`memory-btn ${!tiltModeEnabled ? 'active' : ''}`}
          onClick={() => setTiltModeEnabled(false)}
          aria-pressed={!tiltModeEnabled}
        >
          No Tilt
        </button>
        <button
          type="button"
          className={`memory-btn ${tiltModeEnabled ? 'active' : ''}`}
          onClick={handleEnableTilt}
          aria-pressed={tiltModeEnabled}
        >
          Tilt
        </button>
      </div>
    </div>
  );
};
