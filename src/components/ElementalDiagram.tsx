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
  createInitialDiagramLayout,
  diagramLayoutsEqual,
  resolveDiagramLayout,
  type DiagramLayoutResolution,
} from '../diagram/diagramScaling';
import {
  getDiagramNodePositions,
  groupEffectiveRadius,
  primaryEffectiveRadius,
} from '../diagram/diagramNodeGeometry';
import { parentElementStyle } from '../music/elementTokens';
import { useChordContext } from '../context/ChordContext';
import { BREAKPOINTS } from '../layout/breakpoints';
import { useLayoutTier } from '../hooks/useLayoutTier';
import {
  applyDiagramOverlayMetrics,
  computeDiagramOverlayMetrics,
} from '../diagram/diagramOverlayMetrics';
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

const BORROWING_LINES = [1, 2, 3, 4] as const;

export const ElementalDiagram = React.memo(function ElementalDiagram({
  children,
}: {
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutTier = useLayoutTier();
  const [diagramLayout, setDiagramLayout] = useState<DiagramLayoutResolution>(() =>
    createInitialDiagramLayout(layoutTier, BREAKPOINTS.compactDiagramWidth),
  );

  const {
    selectedChord,
    borrowingState,
    handleChordPointerDown,
    handleChordPointerUp,
    handleChordPointerEnter,
    tonalCenter,
    octaveRange,
  } = useChordContext();

  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [hoveredSliceIdx, setHoveredSliceIdx] = useState<number | null>(null);
  const [isDiagramReady, setIsDiagramReady] = useState(false);

  const measureContainer = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    if (width > 0 && height > 0) {
      const layout = resolveDiagramLayout({
        containerWidth: width,
        containerHeight: height,
        layoutTier,
        compactDiagramWidth: BREAKPOINTS.compactDiagramWidth,
      });
      setDiagramLayout((prev) =>
        diagramLayoutsEqual(prev, layout) ? prev : layout,
      );
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
    setDiagramLayout(
      createInitialDiagramLayout(layoutTier, BREAKPOINTS.compactDiagramWidth),
    );
  }, [layoutTier]);

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

  const {
    isCompactDiagram,
    viewBoxString: viewBox,
    preserveAspectRatio,
    aspectRatioCorrection,
    nodeRadii: { rMain: R_MAIN, rGroup: R_GROUP },
  } = diagramLayout;

  const showLabels = !isCompactDiagram;

  const isBorrowingActive = selectedChord
    ? BORROWING_LINES.some((line) => {
        const pos = borrowingState.circlePositions[line];
        const noteState = borrowingState.noteStates[line];
        return pos && pos !== 'line' && noteState === 'on';
      })
    : false;

  const {
    primaryNodes,
    earthC,
    windC,
    fireC,
    groupCenters,
    groupChords,
    getParentCoords,
    getGroupParentCoords,
  } = useMemo(() => {
    const { primaries, groups } = getDiagramNodePositions();
    const parentCoords = Object.fromEntries(
      primaries.map((p) => [p.id, { x: p.x, y: p.y }]),
    ) as Record<string, { x: number; y: number }>;

    const primaryNodes = primaries.map((p) => ({
      chord: chordManager.getChordByName(p.id),
      x: p.x,
      y: p.y,
    }));

    const groupCenters = Object.fromEntries(
      groups.map((g) => [g.id, { x: g.x, y: g.y }]),
    ) as Record<string, { x: number; y: number }>;

    const groupChords = Object.fromEntries(
      BASE_GROUPS.map((baseName) => [
        baseName,
        SLICE_VARIANTS.map(
          (v) => chordManager.getChordByName(v.prefix + baseName) ?? undefined,
        ),
      ]),
    ) as Record<string, (Chord | undefined)[]>;

    const getParentCoords = (name: string) => parentCoords[name] ?? null;

    const getGroupParentCoords = (baseName: string) => {
      const parents = AXIS_PARENTS[baseName];
      if (!parents) return null;
      const p1C = getParentCoords(parents.p1);
      const p2C = getParentCoords(parents.p2);
      if (!p1C || !p2C) return null;
      return { p1C, p2C };
    };

    return {
      primaryNodes,
      earthC: parentCoords.Earth ?? null,
      windC: parentCoords.Wind ?? null,
      fireC: parentCoords.Fire ?? null,
      groupCenters,
      groupChords,
      getParentCoords,
      getGroupParentCoords,
    };
    // chordManager rebuilds when tonal center or octave range changes;
    // refresh cached Chord objects so slice taps use the new spellings.
  }, [tonalCenter, octaveRange]);

  return (
    <div
      className="diagram-container"
      ref={containerRef}
      style={{ opacity: isDiagramReady ? 1 : 0 }}
      data-layout-tier={layoutTier === 'phone' ? 'phone' : undefined}
      data-tour-id="tour-diagram"
    >
      <DiagramBackgroundOrbs />
      <DiagramVoicingOverlay />
      {layoutTier !== 'phone' && <DiagramCornerActions />}
      <svg
        viewBox={viewBox}
        className="diagram-svg"
        preserveAspectRatio={preserveAspectRatio}
        role="group"
        aria-label="Elemental chord diagram"
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
          const chords = groupChords[baseName];
          const center = groupCenters[baseName];
          if (!center || !chords) return null;
          const cx = center.x;
          const cy = center.y;

          const r           = R_GROUP;
          const palette     = GROUP_PALETTE[baseName] ?? { color: 'var(--color-mixed)', glow: 'rgba(255,255,255,0.2)' };
          const baseColor   = palette.color;
          const glowColor   = palette.glow;
          const isThisGroup = hoveredGroup === baseName;

          const selectedSlice = chords.findIndex(
            (c) => c && selectedChord?.name === c.name,
          );
          const anySelected = selectedSlice >= 0;
          const baseOpacity = [0.72, 0.60, 0.55, 0.63];
          const crosshairD = r / Math.SQRT2;

          return (
            <g
              key={baseName}
              transform={`translate(${cx}, ${cy})`}
              onMouseLeave={() => { setHoveredGroup(null); setHoveredSliceIdx(null); }}
            >
              <g transform={`scale(1, ${aspectRatioCorrection})`}>
                <circle
                  r={groupEffectiveRadius(r)}
                  fill={glowColor}
                  filter="url(#glow)"
                  opacity={anySelected ? 0.55 : isThisGroup ? 0.25 : 0.12}
                />
                {SLICE_VARIANTS.map((v, i) => {
                  const chord = chords[i];
                  if (!chord) return null;
                  const freshChord =
                    chordManager.getChordByName(chord.name) ?? chord;
                  const isSelected = selectedSlice === i;
                  const isHov = isThisGroup && hoveredSliceIdx === i;
                  const opacity = isSelected
                    ? 1.0
                    : isHov
                      ? 0.88
                      : baseOpacity[i];

                  return (
                    <path
                      key={i}
                      d={piePath(r, v.sliceIdx)}
                      fill={baseColor}
                      fillOpacity={opacity}
                      stroke={isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.45)'}
                      strokeWidth={isSelected ? 2.5 : 1}
                      style={{ cursor: 'pointer', transition: 'fill-opacity 0.12s ease' }}
                      role="button"
                      tabIndex={0}
                      aria-label={freshChord.name}
                      aria-pressed={isSelected}
                      onPointerEnter={() => {
                        setHoveredGroup(baseName);
                        setHoveredSliceIdx(i);
                        handleChordPointerEnter(freshChord);
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.currentTarget.releasePointerCapture(e.pointerId);
                        handleChordPointerDown(freshChord);
                      }}
                      onPointerUp={() => handleChordPointerUp()}
                      onFocus={() => {
                        setHoveredGroup(baseName);
                        setHoveredSliceIdx(i);
                      }}
                      onKeyDown={(e) => {
                        if (e.repeat) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleChordPointerDown(freshChord);
                        }
                      }}
                      onKeyUp={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleChordPointerUp();
                        }
                      }}
                    />
                  );
                })}
                <line x1={-crosshairD} y1={-crosshairD} x2={crosshairD} y2={crosshairD} stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" pointerEvents="none" />
                <line x1={crosshairD} y1={-crosshairD} x2={-crosshairD} y2={crosshairD} stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" pointerEvents="none" />
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

        {primaryNodes.map(({ chord, x, y }) => {
          if (!chord) return null;
          const isSelected = selectedChord?.name === chord.name;
          const r = R_MAIN;
          const freshChord = chordManager.getChordByName(chord.name) ?? chord;

          return (
            <g
              key={chord.name}
              transform={`translate(${x}, ${y})`}
              className={`chord-node ${isSelected ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={chord.name}
              aria-pressed={isSelected}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.releasePointerCapture(e.pointerId);
                handleChordPointerDown(freshChord);
              }}
              onPointerUp={() => handleChordPointerUp()}
              onPointerEnter={() => {
                handleChordPointerEnter(freshChord);
              }}
              onKeyDown={(e) => {
                if (e.repeat) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleChordPointerDown(freshChord);
                }
              }}
              onKeyUp={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleChordPointerUp();
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <g transform={`scale(1, ${aspectRatioCorrection})`}>
                <circle
                  className="chord-node-glow"
                  r={primaryEffectiveRadius(r)}
                  fill={parentElementStyle(chord.name).glow}
                  filter="url(#glow)"
                  opacity={isSelected ? 1 : 0.4}
                />
                <circle
                  className="chord-node-core"
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
