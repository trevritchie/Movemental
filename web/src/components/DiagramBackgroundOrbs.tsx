import React, { useRef } from 'react';
import { useChordContext } from '../context/ChordContext';
import { useTiltReadoutContext } from '../context/TiltReadoutContext';
import { useOrbTiltPhysics } from '../hooks/useOrbTiltPhysics';

export const DiagramBackgroundOrbs = React.memo(function DiagramBackgroundOrbs() {
  const { tiltModeEnabled } = useChordContext();
  const { tiltStatus, orientationRef } = useTiltReadoutContext();

  const playfieldRef = useRef<HTMLDivElement>(null);

  const physicsActive = tiltModeEnabled && tiltStatus === 'active';

  useOrbTiltPhysics({
    enabled: physicsActive,
    playfieldRef,
    orientationRef,
  });

  return (
    <div
      className={`diagram-background-orbs${physicsActive ? ' diagram-background-orbs--physics' : ''}`}
      aria-hidden
    >
      <div ref={playfieldRef} className="diagram-orb-blur">
        <div className="diagram-orb-wrapper">
          <div className="diagram-glow-orb diagram-glow-orb--earth" />
          <div className="diagram-glow-orb diagram-glow-orb--wind" />
          <div className="diagram-glow-orb diagram-glow-orb--fire" />
        </div>
      </div>
    </div>
  );
});
