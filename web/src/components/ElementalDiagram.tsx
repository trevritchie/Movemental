import React, { useState } from 'react';
import { chordManager, type Chord } from '../music/ChordManager';
import { useChordContext } from '../context/ChordContext';

// The 12 chord groups (base names only)
const BASE_GROUPS = [
  'Trunk', 'Branch', 'Sand-Storm', 'Leaf',
  'Smoke', 'Ember', 'Fire-Storm', 'Flame',
  'Magma', 'Glass', 'Forest-Fire', 'Charcoal',
];

// 4 variants per group in clockwise order
const SLICE_VARIANTS = [
  { prefix: '',          label: 'Base', sliceIdx: 0 },
  { prefix: 'Sister ',  label: 'Si.',  sliceIdx: 1 },
  { prefix: 'Twin ',    label: 'Tw.',  sliceIdx: 2 },
  { prefix: 'Brother ', label: 'Br.',  sliceIdx: 3 },
];

// ── Pre-computed colours for each of the 12 chord groups ──────────────────────

// Pre-computed colours for each of the 12 chord groups.
// t=0.22 → ~3:1 ratio toward p1, t=0.50 → balanced, t=0.78 → ~3:1 toward p2
// Macro-Out groups (Branch, Ember, Glass) are slightly lighter (+4 L)
// Macro-In  groups (Sand-Storm, Fire-Storm, Forest-Fire) are slightly darker (-4 L)
const GROUP_PALETTE: Record<string, { color: string; glow: string }> = {
  // Earth-based / Woody / Greenery
  'Trunk':      { color: 'hsl(25, 42%, 35%)',   glow: 'hsla(25, 42%, 35%, 0.55)' },    // Solid tree trunk brown
  'Branch':     { color: 'hsl(32, 45%, 42%)',   glow: 'hsla(32, 45%, 42%, 0.55)' },    // Warm medium branch brown
  'Leaf':       { color: 'hsl(122, 48%, 38%)',  glow: 'hsla(122, 48%, 38%, 0.55)' },   // Vibrant leaf green
  'Sand-Storm': { color: 'hsl(42, 45%, 46%)',   glow: 'hsla(42, 45%, 46%, 0.55)' },    // Sandy gold / dust beige

  // Wind / Atmospheric / Smokey
  'Smoke':      { color: 'hsl(215, 18%, 48%)',  glow: 'hsla(215, 18%, 48%, 0.55)' },   // Slate blue-grey
  'Ember':      { color: 'hsl(18, 90%, 45%)',   glow: 'hsla(18, 90%, 45%, 0.55)' },    // Glowing hot ember orange
  'Fire-Storm': { color: 'hsl(8, 88%, 42%)',    glow: 'hsla(8, 88%, 42%, 0.55)' },     // Violent red-orange storm
  'Flame':      { color: 'hsl(28, 95%, 48%)',   glow: 'hsla(28, 95%, 48%, 0.55)' },    // Bright active flame orange-yellow

  // Fire / Deep Earth / Crystalline
  'Magma':       { color: 'hsl(356, 85%, 40%)',  glow: 'hsla(356, 85%, 40%, 0.55)' },   // Deep molten lava red
  'Glass':       { color: 'hsl(182, 55%, 44%)',  glow: 'hsla(182, 55%, 44%, 0.55)' },   // Glassy teal / crystalline turquoise
  'Forest-Fire': { color: 'hsl(135, 38%, 28%)',  glow: 'hsla(135, 38%, 28%, 0.55)' },   // Dark pine/burnt forest green
  'Charcoal':    { color: 'hsl(0, 0%, 28%)',     glow: 'hsla(0, 0%, 28%, 0.55)' },      // Dark charcoal grey
};
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SVG path for one 90° pie slice, rotated 45° so slices point N/E/S/W.
 * slice 0 = top (Base), 1 = right (Sister), 2 = bottom (Twin), 3 = left (Brother)
 */
function piePath(r: number, slice: number): string {
  const d = r / Math.SQRT2; // corner distance at 45°
  const corners = [
    [-d, -d], // NW
    [ d, -d], // NE
    [ d,  d], // SE
    [-d,  d], // SW
  ];
  const [x1, y1] = corners[slice];
  const [x2, y2] = corners[(slice + 1) % 4];
  return `M 0,0 L ${x1},${y1} A ${r},${r} 0 0,1 ${x2},${y2} Z`;
}


export const ElementalDiagram: React.FC = () => {
  const {
    selectedChord,
    handleChordPointerDown,
    handleChordPointerUp,
    handleChordPointerEnter
  } = useChordContext();
  const VIEW_W = 1160;
  const VIEW_H = 800;

  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [hoveredSliceIdx, setHoveredSliceIdx] = useState<number | null>(null);

  const getCoords = (chord: Chord | undefined) => {
    if (!chord) return null;
    const coord = chordManager.getCoordinateForChord(chord.name);
    if (!coord) return null;
    return { x: coord.x * VIEW_W, y: coord.y * VIEW_H };
  };

  // Exact-name match only — prevents 'Forest-Fire' and 'Fire-Storm' from matching 'Fire'
  const getColor = (name: string) => {
    if (name === 'Earth') return 'var(--color-earth)';
    if (name === 'Wind')  return 'var(--color-wind)';
    if (name === 'Fire')  return 'var(--color-fire)';
    return 'var(--color-mixed)';
  };

  const getGlow = (name: string) => {
    if (name === 'Earth') return 'var(--glow-earth)';
    if (name === 'Wind')  return 'var(--glow-wind)';
    if (name === 'Fire')  return 'var(--glow-fire)';
    return 'rgba(255,255,255,0.15)';
  };

  const earth = chordManager.getChordByName('Earth');
  const wind  = chordManager.getChordByName('Wind');
  const fire  = chordManager.getChordByName('Fire');
  const earthC = getCoords(earth ?? undefined);
  const windC  = getCoords(wind  ?? undefined);
  const fireC  = getCoords(fire  ?? undefined);

  const R_MAIN  = 52;
  const R_GROUP = 54;

  return (
    <div className="diagram-container">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="diagram-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Triangle outline */}
        {earthC && windC && fireC && (
          <polygon
            points={`${earthC.x},${earthC.y} ${windC.x},${windC.y} ${fireC.x},${fireC.y}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="3"
          />
        )}

        {/* ── 12 quadrant group nodes ── */}
        {BASE_GROUPS.map((baseName) => {
          // Resolve all 4 chord objects for this group
          const chords = SLICE_VARIANTS.map(v =>
            chordManager.getChordByName(v.prefix + baseName) ?? undefined
          );
          const coords = chords.map(c => getCoords(c));
          if (coords.some(c => !c)) return null;

          // Centre = average of the 4 individual chord positions
          const cx = coords.reduce((s, c) => s + c!.x, 0) / 4;
          const cy = coords.reduce((s, c) => s + c!.y, 0) / 4;

          const r           = R_GROUP;
          const palette     = GROUP_PALETTE[baseName] ?? { color: 'var(--color-mixed)', glow: 'rgba(255,255,255,0.2)' };
          const baseColor   = palette.color;
          const glowColor   = palette.glow;
          const isThisGroup = hoveredGroup === baseName;

          // Which slice (if any) is currently selected?
          const selectedSlice = SLICE_VARIANTS.findIndex(v => {
            const c = chordManager.getChordByName(v.prefix + baseName);
            return c && selectedChord?.name === c.name;
          });
          const anySelected = selectedSlice >= 0;

          // Per-slice base opacity (Base slightly brighter, twins slightly dimmer)
          const baseOpacity = [0.72, 0.60, 0.55, 0.63];

          return (
            <g
              key={baseName}
              transform={`translate(${cx}, ${cy})`}
              onMouseLeave={() => { setHoveredGroup(null); setHoveredSliceIdx(null); }}
            >
              {/* Glow halo */}
              <circle
                r={r * 1.25}
                fill={glowColor}
                filter="url(#glow)"
                opacity={anySelected ? 0.55 : isThisGroup ? 0.25 : 0.12}
              />

              {/* 4 pie slices */}
              {SLICE_VARIANTS.map((v, i) => {
                const chord      = chords[i];
                const isSelected = selectedSlice === i;
                const isHov      = isThisGroup && hoveredSliceIdx === i;
                const opacity    = isSelected ? 1.0 : isHov ? 0.88 : baseOpacity[i];

                return (
                  <path
                    key={i}
                    d={piePath(r, v.sliceIdx)}
                    fill={baseColor}
                    fillOpacity={opacity}
                    stroke={isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.45)'}
                    strokeWidth={isSelected ? 2.5 : 1}
                    style={{ cursor: 'pointer', transition: 'fill-opacity 0.12s ease' }}
                    onPointerEnter={() => {
                      setHoveredGroup(baseName);
                      setHoveredSliceIdx(i);
                      chord && handleChordPointerEnter(chord);
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.currentTarget.releasePointerCapture(e.pointerId);
                      chord && handleChordPointerDown(chord);
                    }}
                    onPointerUp={() => handleChordPointerUp()}
                  />
                );
              })}

              {/* X dividers — match the 45°-rotated slice cuts */}
              {(() => { const d = r / Math.SQRT2; return (<>
                <line x1={-d} y1={-d} x2={d} y2={d}  stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" pointerEvents="none" />
                <line x1={d}  y1={-d} x2={-d} y2={d} stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" pointerEvents="none" />
              </>); })()}

              {/* Outer ring */}
              <circle
                r={r}
                fill="none"
                stroke={anySelected ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.18)'}
                strokeWidth={anySelected ? 2.5 : 1}
                pointerEvents="none"
              />

              {/* Group name below node */}
              <text
                y={r + 24}
                fill={isThisGroup ? '#ffffff' : 'rgba(255, 255, 255, 0.85)'}
                fontSize={15}
                fontWeight="600"
                textAnchor="middle"
                pointerEvents="none"
              >
                {baseName}
              </text>
            </g>
          );
        })}

        {/* ── 3 main element nodes (rendered on top) ── */}
        {([earth, wind, fire] as (Chord | undefined)[]).map((chord) => {
          if (!chord) return null;
          const coords = getCoords(chord);
          if (!coords) return null;
          const isSelected = selectedChord?.name === chord.name;
          const r = R_MAIN;

          return (
            <g
              key={chord.name}
              transform={`translate(${coords.x}, ${coords.y})`}
              className={`chord-node ${isSelected ? 'active' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.releasePointerCapture(e.pointerId);
                handleChordPointerDown(chord);
              }}
              onPointerUp={() => handleChordPointerUp()}
              onPointerEnter={() => {
                handleChordPointerEnter(chord);
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle r={r * 1.2} fill={getGlow(chord.name)} filter="url(#glow)" opacity={isSelected ? 1 : 0.4} />
              <circle
                r={r}
                fill={getColor(chord.name)}
                stroke={isSelected ? 'white' : 'rgba(255,255,255,0.25)'}
                strokeWidth={isSelected ? 4 : 1.5}
              />
              <text y={r + 29} fill="#ffffff" fontSize={24} fontWeight="bold" textAnchor="middle">
                {chord.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
