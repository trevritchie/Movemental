import React, { useMemo } from 'react';
import { NOTE_NAMES_FLAT } from '../music/config';
import { useChordContext } from '../context/ChordContext';

const CLOCK_RADIUS = 108;
const CLOCK_CX = 150;
const CLOCK_CY = 155;

// Precompute static geometry for clock face background
const CLOCK_POINTS = Array.from({ length: 12 }).map((_, i) => {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CLOCK_CX + CLOCK_RADIUS * Math.cos(angle),
    y: CLOCK_CY + CLOCK_RADIUS * Math.sin(angle),
    labelX: CLOCK_CX + (CLOCK_RADIUS + 22) * Math.cos(angle),
    labelY: CLOCK_CY + (CLOCK_RADIUS + 22) * Math.sin(angle),
  };
});

const BACKGROUND_LINES = (() => {
  const lines = [];
  for (let i = 0; i < 12; i++) {
    for (let j = i + 1; j < 12; j++) {
      lines.push(
        <line 
          key={`bg-${i}-${j}`} 
          x1={CLOCK_POINTS[i].x} y1={CLOCK_POINTS[i].y} x2={CLOCK_POINTS[j].x} y2={CLOCK_POINTS[j].y} 
          stroke="rgba(255,255,255,0.03)" 
          strokeWidth={1} 
        />
      );
    }
  }
  return lines;
})();

export const ClockFace: React.FC<{ isMobileOverlay?: boolean }> = ({ isMobileOverlay }) => {
  const { tonalCenter, activePitches, selectedChord } = useChordContext();
  
  const elementalName = selectedChord?.name || null;
  const traditionalName = selectedChord?.traditionalName || null;

  // Chemistry formula: count active pitches per element.
  // Must use relative pitch class (same as clock face dots):
  //   relativePitchClass = (pitch % 12 - tonalCenter + 12) % 12
  //   rem = relativePitchClass % 3 → 0=Earth, 1=Wind, 2=Fire
  const elementFormula = React.useMemo(() => {
    const active = activePitches.filter((p): p is number => p !== null);
    if (active.length === 0) return null;

    let earth = 0, wind = 0, fire = 0;
    for (const p of active) {
      const relPc = ((p % 12) - tonalCenter + 12) % 12;
      const rem = relPc % 3;
      if (rem === 0) earth++;
      else if (rem === 1) wind++;
      else fire++;
    }
    return { earth, wind, fire };
  }, [activePitches, tonalCenter]);
  const getElementColor = (relativePitchClass: number) => {
    const rem = ((relativePitchClass % 3) + 3) % 3;
    if (rem === 0) return 'var(--color-earth)';
    if (rem === 1) return 'var(--color-wind)';
    return 'var(--color-fire)';
  };

  const ticks = useMemo(() => {
    return CLOCK_POINTS.map((pt, i) => {
      const noteIndex = (i + tonalCenter) % 12;
      return { ...pt, noteName: NOTE_NAMES_FLAT[noteIndex] };
    });
  }, [tonalCenter]);

  const activeNodes = useMemo(() => {
    return activePitches
      .filter((p): p is number => p !== null)
      .map(pitch => {
        const pitchClass = pitch % 12;
        const adjustedPitchClass = (pitchClass - tonalCenter + 12) % 12;
        const angle = (adjustedPitchClass / 12) * Math.PI * 2 - Math.PI / 2;
        return {
          x: CLOCK_CX + CLOCK_RADIUS * Math.cos(angle),
          y: CLOCK_CY + CLOCK_RADIUS * Math.sin(angle),
          pitch
        };
      });
  }, [activePitches, tonalCenter]);

  const connectionLines = useMemo(() => {
    const lines: { x1: number, y1: number, x2: number, y2: number }[] = [];
    for (let i = 0; i < activeNodes.length; i++) {
      for (let j = i + 1; j < activeNodes.length; j++) {
        lines.push({
          x1: activeNodes[i].x,
          y1: activeNodes[i].y,
          x2: activeNodes[j].x,
          y2: activeNodes[j].y
        });
      }
    }
    return lines;
  }, [activeNodes]);

  return (
    <div className={`clock-container ${isMobileOverlay ? 'mobile-overlay' : ''}`}>
      <div className="clock-info">
        <div className="elemental-name">{elementalName || 'Select a Chord'}</div>
        {elementFormula && (
          <div className="chemistry-formula" aria-label="Elemental chemistry formula">
            {elementFormula.earth > 0 && (
              <span className="chem-element chem-earth">
                Earth<sub>{elementFormula.earth}</sub>
              </span>
            )}
            {elementFormula.wind > 0 && (
              <span className="chem-element chem-wind">
                Wind<sub>{elementFormula.wind}</sub>
              </span>
            )}
            {elementFormula.fire > 0 && (
              <span className="chem-element chem-fire">
                Fire<sub>{elementFormula.fire}</sub>
              </span>
            )}
          </div>
        )}
        <div className="traditional-name">{traditionalName || '---'}</div>
      </div>
      
      <svg viewBox="0 0 300 300" className="clock-svg">
        <circle cx={CLOCK_CX} cy={CLOCK_CY} r={CLOCK_RADIUS} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
        
        {BACKGROUND_LINES}

        {ticks.map((tick, i) => (
          <g key={i}>
            <circle cx={tick.x} cy={tick.y} r={4.5} fill={getElementColor(i)} />
            <text 
              x={tick.labelX} 
              y={tick.labelY} 
              fill="rgba(255,255,255,0.8)" 
              fontSize={13} 
              textAnchor="middle" 
              alignmentBaseline="middle"
            >
              {tick.noteName}
            </text>
          </g>
        ))}

        {connectionLines.map((line, i) => (
          <line 
            key={`conn-${i}`}
            x1={line.x1} y1={line.y1} 
            x2={line.x2} y2={line.y2}
            stroke="white"
            strokeWidth={2}
          />
        ))}

        {activeNodes.map((node, i) => {
          const relativePitchClass = (node.pitch % 12 - tonalCenter + 12) % 12;
          const nodeColor = getElementColor(relativePitchClass);
          return (
            <circle 
              key={`node-${i}`}
              cx={node.x} cy={node.y} 
              r={8} 
              fill={nodeColor} 
              stroke="white"
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
    </div>
  );
};
