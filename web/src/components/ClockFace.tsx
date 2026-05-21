import React from 'react';
import { NOTE_NAMES_FLAT } from '../music/config';
import { useChordContext } from '../context/ChordContext';

export const ClockFace: React.FC = () => {
  const { tonalCenter, activePitches, selectedChord } = useChordContext();
  
  const elementalName = selectedChord?.name || null;
  const traditionalName = selectedChord?.traditionalName || null;

  const getElementColor = (relativePitchClass: number) => {
    const rem = ((relativePitchClass % 3) + 3) % 3;
    if (rem === 0) return 'var(--color-earth)';
    if (rem === 1) return 'var(--color-wind)';
    return 'var(--color-fire)';
  };

  const radius = 108;
  const cx = 150;
  const cy = 155;
  
  const ticks = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    
    const labelX = cx + (radius + 22) * Math.cos(angle);
    const labelY = cy + (radius + 22) * Math.sin(angle);
    
    const noteIndex = (i + tonalCenter) % 12;
    const noteName = NOTE_NAMES_FLAT[noteIndex];
    
    return { x, y, labelX, labelY, noteName };
  });

  const activeNodes = activePitches
    .filter((p): p is number => p !== null)
    .map(pitch => {
      const pitchClass = pitch % 12;
      const adjustedPitchClass = (pitchClass - tonalCenter + 12) % 12;
      const angle = (adjustedPitchClass / 12) * Math.PI * 2 - Math.PI / 2;
      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        pitch
      };
    });

  const connectionLines: { x1: number, y1: number, x2: number, y2: number }[] = [];
  for (let i = 0; i < activeNodes.length; i++) {
    for (let j = i + 1; j < activeNodes.length; j++) {
      connectionLines.push({
        x1: activeNodes[i].x,
        y1: activeNodes[i].y,
        x2: activeNodes[j].x,
        y2: activeNodes[j].y
      });
    }
  }

  return (
    <div className="clock-container">
      <div className="clock-info">
        <div className="elemental-name">{elementalName || 'Select a Chord'}</div>
        <div className="traditional-name">{traditionalName || '---'}</div>
      </div>
      
      <svg width="100%" height="100%" viewBox="0 0 300 300" className="clock-svg">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
        
        {ticks.map((t1, i) => 
          ticks.map((t2, j) => 
            i < j ? (
              <line 
                key={`bg-${i}-${j}`} 
                x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} 
                stroke="rgba(255,255,255,0.03)" 
                strokeWidth={1} 
              />
            ) : null
          )
        )}

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
