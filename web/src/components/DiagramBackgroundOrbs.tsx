import React, { useCallback, useRef, useState } from 'react';
import { useChordContext } from '../context/ChordContext';
import { useTiltReadoutContext } from '../context/TiltReadoutContext';
import { useOrbTiltPhysics } from '../hooks/useOrbTiltPhysics';

/**
 * Splash-identical Earth/Wind/Fire glow layer behind the elemental diagram SVG.
 * Ambient mode: CSS swirl + float. Tilt mode: same swirl/float, with the group
 * spring-offset like a bubble level from device orientation.
 * Chord taps pause only the tilt rAF loop, not ambient CSS motion.
 */
export const DiagramBackgroundOrbs = React.memo(function DiagramBackgroundOrbs() {
  const { tiltModeEnabled, glowingOrbsEnabled } = useChordContext();
  const { tiltStatus, orientationRef } = useTiltReadoutContext();

  const playfieldRef = useRef<HTMLDivElement>(null);
  const [levelMoving, setLevelMoving] = useState(false);

  const levelActive =
    glowingOrbsEnabled && tiltModeEnabled && tiltStatus === 'active';

  const handleFrameMetrics = useCallback(
    (metrics: { moving: boolean }) => {
      setLevelMoving((prev) => (prev === metrics.moving ? prev : metrics.moving));
    },
    [],
  );

  useOrbTiltPhysics({
    enabled: levelActive,
    playfieldRef,
    orientationRef,
    onFrameMetrics: handleFrameMetrics,
  });

  if (!glowingOrbsEnabled) {
    return null;
  }

  const className = [
    'diagram-background-orbs',
    levelActive ? 'diagram-background-orbs--level' : '',
    levelActive && levelMoving ? 'diagram-background-orbs--level-active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} aria-hidden>
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
