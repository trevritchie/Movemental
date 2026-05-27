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

// Explicit map: every chord name → its base group name.
// Built once at module load from BASE_GROUPS × SLICE_VARIANTS so
// active-group detection is a simple O(1) lookup with no string inference.
const CHORD_TO_GROUP = new Map<string, string>(
  BASE_GROUPS.flatMap(group =>
    SLICE_VARIANTS.map(v => [v.prefix + group, group] as [string, string])
  )
);

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

// Mapping each of the 12 chord groups to their two parent axis elements
const AXIS_PARENTS: Record<string, { p1: string; p2: string }> = {
  // Earth-Wind axis
  'Trunk':      { p1: 'Earth', p2: 'Wind' },
  'Branch':     { p1: 'Earth', p2: 'Wind' },
  'Sand-Storm': { p1: 'Earth', p2: 'Wind' },
  'Leaf':       { p1: 'Earth', p2: 'Wind' },

  // Wind-Fire axis
  'Smoke':      { p1: 'Wind', p2: 'Fire' },
  'Ember':      { p1: 'Wind', p2: 'Fire' },
  'Fire-Storm': { p1: 'Wind', p2: 'Fire' },
  'Flame':      { p1: 'Wind', p2: 'Fire' },

  // Fire-Earth axis
  'Magma':       { p1: 'Fire', p2: 'Earth' },
  'Glass':       { p1: 'Fire', p2: 'Earth' },
  'Forest-Fire': { p1: 'Fire', p2: 'Earth' },
  'Charcoal':    { p1: 'Fire', p2: 'Earth' },
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


const VIEW_W = 1160;
const VIEW_H = 800;
// We will calculate R_MAIN and R_GROUP dynamically inside the component based on isMobile.

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

export const ElementalDiagram: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const {
    selectedChord,
    borrowingState,
    handleChordPointerDown,
    handleChordPointerUp,
    handleChordPointerEnter,
    tonalCenter,
    voicing,
    octaveRange
  } = useChordContext();

  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [hoveredSliceIdx, setHoveredSliceIdx] = useState<number | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 950);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 950);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const viewBox = isMobile ? `0 180 ${VIEW_W} 540` : `0 0 ${VIEW_W} ${VIEW_H}`;

  const R_MAIN = isMobile ? 70 : 52;
  const R_GROUP = isMobile ? 72 : 54;

  // A voice is currently borrowed if circlePosition !== 'line' and the voice note state is 'on'
  const isBorrowingActive = selectedChord ? [1, 2, 3, 4].some(line => {
    const pos = borrowingState.circlePositions[line] || (borrowingState.circlePositions as any)[String(line)];
    const noteState = borrowingState.noteStates[line] || (borrowingState.noteStates as any)[String(line)];
    return pos && pos !== 'line' && noteState === 'on';
  }) : false;

  const getCoords = React.useCallback((chord: Chord | undefined) => {
    if (!chord) return null;
    const coord = chordManager.getCoordinateForChord(chord.name);
    if (!coord) return null;
    return { x: coord.x * VIEW_W, y: coord.y * VIEW_H };
  }, []);

  const { earth, wind, fire, earthC, windC, fireC, groupCenters, getParentCoords, getGroupParentCoords } = React.useMemo(() => {
    const earth = chordManager.getChordByName('Earth');
    const wind  = chordManager.getChordByName('Wind');
    const fire  = chordManager.getChordByName('Fire');
    const earthC = getCoords(earth ?? undefined);
    const windC  = getCoords(wind  ?? undefined);
    const fireC  = getCoords(fire  ?? undefined);

    const getParentCoords = (name: string) => {
      if (name === 'Earth') return earthC;
      if (name === 'Wind')  return windC;
      if (name === 'Fire')  return fireC;
      return null;
    };

    const groupCenters = BASE_GROUPS.reduce((acc, baseName) => {
      const chords = SLICE_VARIANTS.map(v =>
        chordManager.getChordByName(v.prefix + baseName) ?? undefined
      );
      const coords = chords.map(c => getCoords(c));
      if (coords.every(c => !!c)) {
        const cx = coords.reduce((s, c) => s + c!.x, 0) / 4;
        const cy = coords.reduce((s, c) => s + c!.y, 0) / 4;
        acc[baseName] = { x: cx, y: cy };
      }
      return acc;
    }, {} as Record<string, { x: number; y: number }>);

    const getGroupParentCoords = (baseName: string) => {
      const parents = AXIS_PARENTS[baseName];
      if (!parents) return null;
      const p1C = getParentCoords(parents.p1);
      const p2C = getParentCoords(parents.p2);
      if (!p1C || !p2C) return null;
      return { p1C, p2C };
    };

    return { earth, wind, fire, earthC, windC, fireC, groupCenters, getParentCoords, getGroupParentCoords };
  }, [getCoords, tonalCenter, voicing, octaveRange]);

  return (
    <div className="diagram-container">
      <svg
        viewBox={viewBox}
        className="diagram-svg"
        preserveAspectRatio={isMobile ? "none" : "xMidYMid meet"}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="ritual-glow" x="-50%" y="-50%" width="200%" height="200%" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
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

        {/* ── Witch Ritual Glowing Lines ── */}
        {BASE_GROUPS.map((baseName) => {
          const center = groupCenters[baseName];
          const parents = AXIS_PARENTS[baseName];
          const adjusted = getGroupParentCoords(baseName);

          if (!center || !parents || !adjusted) return null;
          const { p1C, p2C } = adjusted;

          const isGroupActive = selectedChord
            ? CHORD_TO_GROUP.get(selectedChord.name) === baseName
            : false;

          const oppParent =
            parents.p1 === 'Earth' && parents.p2 === 'Wind' ? 'Fire' :
            parents.p1 === 'Wind' && parents.p2 === 'Fire' ? 'Earth' :
            'Wind';
          const oppC = getParentCoords(oppParent);

          return (
            <g key={`ritual-${baseName}`}>
              {/* Line from Parent 1 */}
              <line
                x1={p1C.x}
                y1={p1C.y}
                x2={center.x}
                y2={center.y}
                stroke={getColor(parents.p1)}
                strokeWidth={isGroupActive ? 4.5 : 2}
                strokeDasharray={isGroupActive ? "none" : "3 5"}
                opacity={isGroupActive ? 0.95 : 0.35}
                filter={isGroupActive ? "url(#ritual-glow)" : "none"}
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />

              {/* Line from Parent 2 */}
              <line
                x1={p2C.x}
                y1={p2C.y}
                x2={center.x}
                y2={center.y}
                stroke={getColor(parents.p2)}
                strokeWidth={isGroupActive ? 4.5 : 2}
                strokeDasharray={isGroupActive ? "none" : "3 5"}
                opacity={isGroupActive ? 0.95 : 0.35}
                filter={isGroupActive ? "url(#ritual-glow)" : "none"}
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />

              {/* Opposite element line (solid, fades in only when borrowing) */}
              {oppC && (
                <line
                  x1={oppC.x}
                  y1={oppC.y}
                  x2={center.x}
                  y2={center.y}
                  stroke={getColor(oppParent)}
                  strokeWidth={isGroupActive && isBorrowingActive ? 5 : 1.5}
                  strokeDasharray="none"
                  opacity={isGroupActive && isBorrowingActive ? 0.95 : 0}
                  filter={isGroupActive && isBorrowingActive ? 'url(#ritual-glow)' : 'none'}
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              )}
            </g>
          );
        })}

        {/* ── 12 quadrant group nodes ── */}
        {BASE_GROUPS.map((baseName) => {
          // Resolve all 4 chord objects for this group
          const chords = SLICE_VARIANTS.map(v =>
            chordManager.getChordByName(v.prefix + baseName) ?? undefined
          );
          const center = groupCenters[baseName];
          if (!center) return null;
          const cx = center.x;
          const cy = center.y;

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
      {children}
    </div>
  );
};
