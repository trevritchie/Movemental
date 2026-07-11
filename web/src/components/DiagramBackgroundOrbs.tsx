import React, { useRef } from 'react';
import { useChordContext } from '../context/ChordContext';
import { useTiltReadoutContext } from '../context/TiltReadoutContext';
import { useOrbTiltPhysics } from '../hooks/useOrbTiltPhysics';

/**
 * Splash-style Earth/Wind/Fire glow layer behind the elemental diagram SVG.
 *
 * Mounted as the first child of `.diagram-container` (z-index 0) so orbs never
 * cover nodes or overlays. Two visual modes:
 *
 * - No-tilt / desktop: CSS swirl + float animations (see `diagram-orb-*` in index.css).
 * - Tilt mode: CSS animations disabled; `useOrbTiltPhysics` drives orb positions
 *   from device orientation via `orientationRef` (not `tiltSample`, which is
 *   throttled for voicing readouts).
 */
export const DiagramBackgroundOrbs = React.memo(function DiagramBackgroundOrbs() {
  const { tiltModeEnabled } = useChordContext();
  const { tiltStatus, orientationRef } = useTiltReadoutContext();

  const playfieldRef = useRef<HTMLDivElement>(null);

  // Physics only runs when tilt permission is granted and the sensor is active.
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
