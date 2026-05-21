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

// ── Blended colour system ─────────────────────────────────────────────────────
// Element anchor colours in HSL
const E = { h: 28,  s: 55, l: 40 }; // Earth  – amber-brown
const W = { h: 197, s: 66, l: 55 }; // Wind   – sky blue
const F = { h:   5, s: 80, l: 52 }; // Fire   – vivid red

/** Blend two HSL colours, always travelling CLOCKWISE around the hue wheel. */
function blendHSL(
  a: { h: number; s: number; l: number },
  b: { h: number; s: number; l: number },
  t: number,
  lShift = 0,
): { color: string; glow: string } {
  let dh = b.h - a.h;
  if (dh < 0) dh += 360; // clockwise only
  const h = Math.round((a.h + dh * t) % 360);
  const s = Math.round(a.s + (b.s - a.s) * t);
  const l = Math.round(a.l + (b.l - a.l) * t) + lShift;
  return {
    color: `hsl(${h},${s}%,${l}%)`,
    glow:  `hsla(${h},${s}%,${l}%,0.55)`,
  };
}

// Pre-computed colours for each of the 12 chord groups.
// t=0.22 → ~3:1 ratio toward p1, t=0.50 → balanced, t=0.78 → ~3:1 toward p2
// Macro-Out groups (Branch, Ember, Glass) are slightly lighter (+4 L)
// Macro-In  groups (Sand-Storm, Fire-Storm, Forest-Fire) are slightly darker (-4 L)
const GROUP_PALETTE: Record<string, { color: string; glow: string }> = {
  // Earth → Wind  (olive → sage → teal)
  'Trunk':      blendHSL(E, W, 0.22),       // 3E:1W – warm olive
  'Branch':     blendHSL(E, W, 0.50, +4),   // balanced, outward – lighter sage
  'Sand-Storm': blendHSL(E, W, 0.50, -4),   // balanced, inward  – darker sage
  'Leaf':       blendHSL(E, W, 0.78),       // 1E:3W – teal
  // Wind → Fire  (periwinkle → purple → magenta)
  'Smoke':      blendHSL(W, F, 0.22),       // 3W:1F – periwinkle
  'Ember':      blendHSL(W, F, 0.50, +4),   // balanced, outward – violet
  'Fire-Storm': blendHSL(W, F, 0.50, -4),   // balanced, inward  – deep violet
  'Flame':      blendHSL(W, F, 0.78),       // 1W:3F – magenta-red
  // Fire → Earth  (orange-red → amber)
  'Magma':       blendHSL(F, E, 0.22),      // 3F:1E – deep red-orange
  'Glass':       blendHSL(F, E, 0.50, +4),  // balanced, outward – rust
  'Forest-Fire': blendHSL(F, E, 0.50, -4),  // balanced, inward  – dark rust
  'Charcoal':    blendHSL(F, E, 0.78),      // 1F:3E – amber-brown
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

/** Visual centre of each slice (cardinal directions) */
function sliceLabelPos(r: number, slice: number) {
  const d = r * 0.58;
  const positions = [
    { x:  0, y: -d }, // top    (Base)
    { x:  d, y:  0 }, // right  (Sister)
    { x:  0, y:  d }, // bottom (Twin)
    { x: -d, y:  0 }, // left   (Brother)
  ];
  return positions[slice];
}

export const ElementalDiagram: React.FC = () => {
  const {
    selectedChord,
    handleChordPointerDown,
    handleChordPointerUp,
    handleChordPointerEnter
  } = useChordContext();
  const VIEW_W = 1000;
  const VIEW_H = 850;

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

  const R_MAIN  = 35;
  const R_GROUP = 36;

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
                r={r * 1.7}
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

              {/* Hover: show variant label inside the hovered slice */}
              {isThisGroup && hoveredSliceIdx !== null && (() => {
                const { x: lx, y: ly } = sliceLabelPos(r, SLICE_VARIANTS[hoveredSliceIdx].sliceIdx);
                return (
                  <text
                    x={lx} y={ly + 3}
                    fill="white" fontSize={9} fontWeight="700"
                    textAnchor="middle" pointerEvents="none"
                  >
                    {SLICE_VARIANTS[hoveredSliceIdx].label}
                  </text>
                );
              })()}

              {/* Group name below node */}
              <text
                y={r + 15}
                fill={isThisGroup ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.72)'}
                fontSize={10}
                fontWeight="500"
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
              <circle r={r * 1.6} fill={getGlow(chord.name)} filter="url(#glow)" opacity={isSelected ? 1 : 0.4} />
              <circle
                r={r}
                fill={getColor(chord.name)}
                stroke={isSelected ? 'white' : 'rgba(255,255,255,0.25)'}
                strokeWidth={isSelected ? 4 : 1.5}
              />
              <text y={r + 18} fill="rgba(255,255,255,0.92)" fontSize={17} fontWeight="bold" textAnchor="middle">
                {chord.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
