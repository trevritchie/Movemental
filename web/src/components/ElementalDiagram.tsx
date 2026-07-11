import React, {
  useState,
  useLayoutEffect,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { chordManager, type Chord } from '../music/ChordManager';
import {
  BASE_GROUPS,
  SLICE_VARIANTS,
  CHORD_TO_GROUP,
  GROUP_PALETTE,
  AXIS_PARENTS,
} from '../music/diagramMetadata';
import {
  DIAGRAM_VIEW_W,
  DIAGRAM_VIEW_H,
  DIAGRAM_COMPACT_VIEW_W,
  DIAGRAM_COMPACT_VIEW_H,
  DIAGRAM_COMPACT_VIEW_PAD,
} from '../music/diagramLayout';
import { parentElementStyle } from '../music/elementTokens';
import { useChordContext } from '../context/ChordContext';
import { BREAKPOINTS } from '../layout/breakpoints';
import { useLayoutTier } from '../hooks/useLayoutTier';
import {
  applyDiagramOverlayMetrics,
  computeDiagramOverlayMetrics,
} from '../hooks/useDiagramOverlayMetrics';
import { DiagramVoicingOverlay } from './DiagramVoicingOverlay';
import { DiagramCornerActions } from './DiagramCornerActions';
import { DiagramBackgroundOrbs } from './DiagramBackgroundOrbs';
import { useSuppressNativeTouchGestures } from '../hooks/useSuppressNativeTouchGestures';

function piePath(r: number, slice: number): string {
  const d = r / Math.SQRT2;
  const corners = [
    [-d, -d],
    [ d, -d],
    [ d,  d],
    [-d,  d],
  ];
  const [x1, y1] = corners[slice];
  const [x2, y2] = corners[(slice + 1) % 4];
  return `M 0,0 L ${x1},${y1} A ${r},${r} 0 0,1 ${x2},${y2} Z`;
}

export const ElementalDiagram = React.memo(function ElementalDiagram({
  children,
}: {
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [aspectRatioCorrection, setAspectRatioCorrection] = useState(1);

  const {
    selectedChord,
    borrowingState,
    handleChordPointerDown,
    handleChordPointerUp,
    handleChordPointerEnter,
  } = useChordContext();

  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [hoveredSliceIdx, setHoveredSliceIdx] = useState<number | null>(null);

  const layoutTier = useLayoutTier();
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDiagramReady, setIsDiagramReady] = useState(false);

  const measureContainer = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    setContainerWidth(width);
    if (width > 0 && height > 0) {
      const viewBoxAR = DIAGRAM_COMPACT_VIEW_W / DIAGRAM_COMPACT_VIEW_H;
      const containerAR = width / height;
      setAspectRatioCorrection(containerAR / viewBoxAR);
      if (layoutTier === 'phone') {
        applyDiagramOverlayMetrics(
          container,
          computeDiagramOverlayMetrics({ width, height }),
        );
      }
    }
  }, [layoutTier]);

  useSuppressNativeTouchGestures(containerRef);

  useLayoutEffect(() => {
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        measureContainer();
        setIsDiagramReady(true);
      });
    });
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [measureContainer]);

  useEffect(() => {
    if (!isDiagramReady) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(measureContainer);
    observer.observe(container);

    return () => observer.disconnect();
  }, [isDiagramReady, measureContainer]);

  const isCompactDiagram =
    layoutTier === 'phone' ||
    layoutTier === 'tablet' ||
    containerWidth < BREAKPOINTS.compactDiagramWidth;

  const viewBox = isCompactDiagram
    ? `-${DIAGRAM_COMPACT_VIEW_PAD} -${DIAGRAM_COMPACT_VIEW_PAD} ${DIAGRAM_COMPACT_VIEW_W} ${DIAGRAM_COMPACT_VIEW_H}`
    : `0 0 ${DIAGRAM_VIEW_W} ${DIAGRAM_VIEW_H}`;

  const R_MAIN = isCompactDiagram ? 100 : 52;
  const R_GROUP = isCompactDiagram ? 102 : 54;

  const showLabels = !isCompactDiagram;

  const isBorrowingActive = selectedChord ? [1, 2, 3, 4].some(line => {
    const pos = borrowingState.circlePositions[line as 1|2|3|4];
    const noteState = borrowingState.noteStates[line as 1|2|3|4];
    return pos && pos !== 'line' && noteState === 'on';
  }) : false;

  const getCoords = useCallback((chord: Chord | undefined) => {
    if (!chord) return null;
    const coord = chordManager.getCoordinateForChord(chord.name);
    if (!coord) return null;
    return { x: coord.x * DIAGRAM_VIEW_W, y: coord.y * DIAGRAM_VIEW_H };
  }, []);

  const { earth, wind, fire, earthC, windC, fireC, groupCenters, getParentCoords, getGroupParentCoords } = useMemo(() => {
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
  }, [getCoords]);

  const resolveFreshChord = useCallback((chord: Chord) => {
    return chordManager.getChordByName(chord.name) ?? chord;
  }, []);

  return (
    <div
      className="diagram-container"
      ref={containerRef}
      style={{ opacity: isDiagramReady ? 1 : 0 }}
      data-layout-tier={layoutTier === 'phone' ? 'phone' : undefined}
      data-tour-id="tour-diagram"
    >
      {/* Behind SVG (z-index 0); see DiagramBackgroundOrbs */}
      <DiagramBackgroundOrbs />
      <DiagramVoicingOverlay />
      {layoutTier !== 'phone' && <DiagramCornerActions />}
      <svg
        viewBox={viewBox}
        className="diagram-svg"
        preserveAspectRatio={isCompactDiagram ? 'none' : 'xMidYMid meet'}
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

        {earthC && windC && fireC && (
          <polygon
            points={`${earthC.x},${earthC.y} ${windC.x},${windC.y} ${fireC.x},${fireC.y}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="3"
          />
        )}

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
              <line
                x1={p1C.x}
                y1={p1C.y}
                x2={center.x}
                y2={center.y}
                stroke={parentElementStyle(parents.p1).color}
                strokeWidth={isGroupActive ? 4.5 : 2}
                strokeDasharray={isGroupActive ? "none" : "3 5"}
                opacity={isGroupActive ? 0.95 : 0.35}
                filter={isGroupActive ? "url(#ritual-glow)" : "none"}
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
              <line
                x1={p2C.x}
                y1={p2C.y}
                x2={center.x}
                y2={center.y}
                stroke={parentElementStyle(parents.p2).color}
                strokeWidth={isGroupActive ? 4.5 : 2}
                strokeDasharray={isGroupActive ? "none" : "3 5"}
                opacity={isGroupActive ? 0.95 : 0.35}
                filter={isGroupActive ? "url(#ritual-glow)" : "none"}
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
              {oppC && (
                <line
                  x1={oppC.x}
                  y1={oppC.y}
                  x2={center.x}
                  y2={center.y}
                  stroke={parentElementStyle(oppParent).color}
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

        {BASE_GROUPS.map((baseName) => {
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

          const selectedSlice = SLICE_VARIANTS.findIndex(v => {
            const c = chordManager.getChordByName(v.prefix + baseName);
            return c && selectedChord?.name === c.name;
          });
          const anySelected = selectedSlice >= 0;
          const baseOpacity = [0.72, 0.60, 0.55, 0.63];

          return (
            <g
              key={baseName}
              transform={`translate(${cx}, ${cy})`}
              onMouseLeave={() => { setHoveredGroup(null); setHoveredSliceIdx(null); }}
            >
              {/* Correction Group: Inverse the SVG stretch to keep nodes circular */}
              <g transform={`scale(1, ${aspectRatioCorrection})`}>
                <circle
                  r={r * 1.25}
                  fill={glowColor}
                  filter="url(#glow)"
                  opacity={anySelected ? 0.55 : isThisGroup ? 0.25 : 0.12}
                />
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
                        if (chord) handleChordPointerEnter(chord);
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.currentTarget.releasePointerCapture(e.pointerId);
                        if (chord) handleChordPointerDown(chord);
                      }}
                      onPointerUp={() => handleChordPointerUp()}
                    />
                  );
                })}
                {(() => { const d = r / Math.SQRT2; return (<>
                  <line x1={-d} y1={-d} x2={d} y2={d}  stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" pointerEvents="none" />
                  <line x1={d}  y1={-d} x2={-d} y2={d} stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" pointerEvents="none" />
                </>); })()}
                <circle
                  r={r}
                  fill="none"
                  stroke={anySelected ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.18)'}
                  strokeWidth={anySelected ? 2.5 : 1}
                  pointerEvents="none"
                />
                {showLabels && (
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
                )}
              </g>
            </g>
          );
        })}

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
                handleChordPointerDown(resolveFreshChord(chord));
              }}
              onPointerUp={() => handleChordPointerUp()}
              onPointerEnter={() => {
                handleChordPointerEnter(resolveFreshChord(chord));
              }}
              style={{ cursor: 'pointer' }}
            >
              {/* Correction Group: Inverse the SVG stretch to keep nodes circular */}
              <g transform={`scale(1, ${aspectRatioCorrection})`}>
                <circle
                  r={r * 1.2}
                  fill={parentElementStyle(chord.name).glow}
                  filter="url(#glow)"
                  opacity={isSelected ? 1 : 0.4}
                />
                <circle
                  r={r}
                  fill={parentElementStyle(chord.name).color}
                  stroke={isSelected ? 'white' : 'rgba(255,255,255,0.25)'}
                  strokeWidth={isSelected ? 4 : 1.5}
                />
                {showLabels && (
                  <text
                    y={r + 29}
                    fill="#ffffff"
                    fontSize={24}
                    fontWeight="bold"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {chord.name}
                  </text>
                )}
              </g>
            </g>
          );
        })}
      </svg>
      {children}
    </div>
  );
});
