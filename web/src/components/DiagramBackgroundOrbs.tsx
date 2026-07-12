import React, { useRef } from 'react';
import { useChordContext } from '../context/ChordContext';
import { useTiltReadoutContext } from '../context/TiltReadoutContext';
import { useOrbTiltPhysics } from '../hooks/useOrbTiltPhysics';

/**
 * Splash-identical Earth/Wind/Fire glow layer behind the elemental diagram SVG.
 * Ambient mode: CSS swirl + float. Tilt mode: same swirl/float, with the group
 * spring-offset like a bubble level from device orientation.
 * Idle tilt physics cancels rAF; ambient CSS motion is never paused on chord taps.
 */
export const DiagramBackgroundOrbs = React.memo(function DiagramBackgroundOrbs() {
  const { tiltModeEnabled, glowingOrbsEnabled } = useChordContext();
  const { tiltStatus, orientationRef } = useTiltReadoutContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const playfieldRef = useRef<HTMLDivElement>(null);

  const levelActive =
    glowingOrbsEnabled && tiltModeEnabled && tiltStatus === 'active';

  useOrbTiltPhysics({
    enabled: levelActive,
    playfieldRef,
    containerRef,
    orientationRef,
  });

  if (!glowingOrbsEnabled) {
    return null;
  }

  const className = [
    'diagram-background-orbs',
    levelActive ? 'diagram-background-orbs--level' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={containerRef} className={className} aria-hidden>
      <div ref={playfieldRef} className="splash-background">
        <div className="mouse-follower">
          <div className="orb-wrapper">
            <div className="glow-orb orb-1" />
            <div className="glow-orb orb-2" />
            <div className="glow-orb orb-3" />
          </div>
        </div>
      </div>
    </div>
  );
});
