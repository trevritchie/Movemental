import React from 'react';
import { chordManager, type Chord } from '../music/ChordManager';

interface ElementalDiagramProps {
  selectedChord: Chord | null;
  onChordSelect: (chord: Chord) => void;
}

export const ElementalDiagram: React.FC<ElementalDiagramProps> = ({
  selectedChord,
  onChordSelect
}) => {
  // We'll define a viewBox and scale the 0-1 coordinates to fit
  const VIEW_SIZE = 1000;
  
  // Connect the primary elemental nodes with a triangle
  const earth = chordManager.getChordByName("Earth");
  const wind = chordManager.getChordByName("Wind");
  const fire = chordManager.getChordByName("Fire");
  
  const getCoords = (chord: Chord | undefined) => {
    if (!chord) return null;
    const coord = chordManager.getCoordinateForChord(chord.name);
    if (!coord) return null;
    return { x: coord.x * VIEW_SIZE, y: coord.y * VIEW_SIZE };
  };

  const earthCoords = getCoords(earth);
  const windCoords = getCoords(wind);
  const fireCoords = getCoords(fire);

  const getColor = (name: string) => {
    if (name.includes("Earth")) return "var(--color-earth)";
    if (name.includes("Wind")) return "var(--color-wind)";
    if (name.includes("Fire")) return "var(--color-fire)";
    return "var(--color-mixed)";
  };

  const getGlow = (name: string) => {
    if (name.includes("Earth")) return "var(--glow-earth)";
    if (name.includes("Wind")) return "var(--glow-wind)";
    if (name.includes("Fire")) return "var(--glow-fire)";
    return "rgba(255,255,255,0.2)";
  };

  const allChords = Array.from((chordManager as any).chords.values()) as Chord[];

  return (
    <div className="diagram-container">
      <svg 
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} 
        className="diagram-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Add some glow filters */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Draw main triangle connecting the elements if we have them */}
        {earthCoords && windCoords && fireCoords && (
          <polygon 
            points={`${earthCoords.x},${earthCoords.y} ${windCoords.x},${windCoords.y} ${fireCoords.x},${fireCoords.y}`}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
          />
        )}

        {/* Draw nodes */}
        {allChords.map((chord, i) => {
          const coords = getCoords(chord);
          if (!coords) return null;
          
          const isSelected = selectedChord?.name === chord.name;
          const isMainElement = ["Earth", "Wind", "Fire"].includes(chord.name);
          const radius = isMainElement ? 35 : 20;

          return (
            <g 
              key={i} 
              transform={`translate(${coords.x}, ${coords.y})`}
              className={`chord-node ${isSelected ? 'active' : ''}`}
              onClick={() => onChordSelect(chord)}
            >
              {/* Outer glow */}
              <circle 
                r={radius * 1.5} 
                fill={getGlow(chord.name)} 
                filter="url(#glow)"
                opacity={isSelected ? 1 : 0.4}
              />
              
              {/* Inner circle */}
              <circle 
                r={radius} 
                fill={getColor(chord.name)}
                stroke={isSelected ? 'white' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isSelected ? 4 : 1}
              />
              
              {/* Label */}
              <text 
                y={radius + 20} 
                fill="rgba(255,255,255,0.8)" 
                fontSize={isMainElement ? 18 : 12} 
                fontWeight={isMainElement ? 'bold' : 'normal'}
                textAnchor="middle"
              >
                {chord.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
