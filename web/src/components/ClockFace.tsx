import React from 'react';
import { NOTE_NAMES_FLAT } from '../music/config';

interface ClockFaceProps {
  tonalCenter: number;
  activePitches: (number | null)[]; // 4 notes
  elementalName: string | null;
  traditionalName: string | null;
}

export const ClockFace: React.FC<ClockFaceProps> = ({
  tonalCenter,
  activePitches,
  elementalName,
  traditionalName
}) => {
  const radius = 120;
  const cx = 150;
  const cy = 150;
  
  // Create 12 positions for the clock
  const ticks = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    
    // Position labels slightly outside
    const labelX = cx + (radius + 25) * Math.cos(angle);
    const labelY = cy + (radius + 25) * Math.sin(angle);
    
    const noteIndex = (i + tonalCenter) % 12;
    const noteName = NOTE_NAMES_FLAT[noteIndex];
    
    return { x, y, labelX, labelY, noteName };
  });

  // Map active pitches to clock positions
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

  // Calculate connection lines (complete graph between all active nodes)
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
      
      <svg width={300} height={300} className="clock-svg">
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
        
        {/* Background grid lines */}
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

        {/* Ticks and labels */}
        {ticks.map((tick, i) => (
          <g key={i}>
            <circle cx={tick.x} cy={tick.y} r={4} fill="rgba(255,255,255,0.3)" />
            <text 
              x={tick.labelX} 
              y={tick.labelY} 
              fill="rgba(255,255,255,0.6)" 
              fontSize={12} 
              textAnchor="middle" 
              alignmentBaseline="middle"
            >
              {tick.noteName}
            </text>
          </g>
        ))}

        {/* Connection lines for active chord */}
        {connectionLines.map((line, i) => (
          <line 
            key={`conn-${i}`}
            x1={line.x1} y1={line.y1} 
            x2={line.x2} y2={line.y2}
            stroke="white"
            strokeWidth={2}
          />
        ))}

        {/* Active Nodes */}
        {activeNodes.map((node, i) => (
          <circle 
            key={`node-${i}`}
            cx={node.x} cy={node.y} 
            r={8} 
            fill="white" 
          />
        ))}
      </svg>
    </div>
  );
};
