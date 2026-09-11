/**
 * Opt-in Simple Major Triads play surface: triangle vertices stay as the
 * Earth / Wind / Fire parents; large Roman-numeral buttons sit on the axes.
 */
import React, { useMemo } from 'react';
import { useChordContext } from '../context/ChordContext';
import { chordManager } from '../music/ChordManager';
import {
  PARENT_ELEMENT_NAMES,
  parentElementStyle,
  type ParentElementName,
} from '../music/elementTokens';
import {
  formatSimpleTriadCaption,
  SIMPLE_MAJOR_TRIAD_DEFS,
  SIMPLE_TRIAD_AXIS_LABELS,
  resolveSimpleMajorTriad,
  simpleTriadAriaLabel,
  type SimpleMajorTriadId,
  type SimpleTriadAxisId,
} from '../music/simpleMajorTriads';

type Point = { x: number; y: number };
type VertexId = 'earth' | 'wind' | 'fire';
type Triangle = Record<VertexId, Point>;

const PARENT_VERTEX: Record<ParentElementName, VertexId> = {
  Earth: 'earth',
  Wind: 'wind',
  Fire: 'fire',
};

const AXIS_ORDER: readonly SimpleTriadAxisId[] = [
  'earth_wind',
  'earth_fire',
  'wind_fire',
];

const AXIS_ENDS: Record<SimpleTriadAxisId, readonly [VertexId, VertexId]> = {
  earth_wind: ['earth', 'wind'],
  earth_fire: ['earth', 'fire'],
  wind_fire: ['wind', 'fire'],
};

const AXIS_CSS: Record<SimpleTriadAxisId, string> = {
  earth_wind: 'earth-wind',
  earth_fire: 'earth-fire',
  wind_fire: 'wind-fire',
};

const RN_EDGE_T: Record<SimpleMajorTriadId, number> = {
  I: 0.3,
  vi: 0.7,
  ii: 0.22,
  IV: 0.48,
  vii_dim: 0.74,
  iii: 0.32,
  V: 0.68,
};

const AXIS_LABEL_LAYOUT: Record<
  SimpleTriadAxisId,
  { t: number; outset: number }
> = {
  earth_wind: { t: 0.5, outset: 0.07 },
  earth_fire: { t: 0.5, outset: 0.08 },
  wind_fire: { t: 0.5, outset: 0.08 },
};

function lerp(from: Point, to: Point, t: number): Point {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

function pct(point: Point): React.CSSProperties {
  return {
    left: `${point.x * 100}%`,
    top: `${point.y * 100}%`,
  };
}

function offsetFromCentroid(point: Point, centroid: Point, distance: number): Point {
  const dx = point.x - centroid.x;
  const dy = point.y - centroid.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: point.x + (dx / len) * distance,
    y: point.y + (dy / len) * distance,
  };
}

function axisPoint(triangle: Triangle, axis: SimpleTriadAxisId, t: number): Point {
  const [fromKey, toKey] = AXIS_ENDS[axis];
  return lerp(triangle[fromKey], triangle[toKey], t);
}

function releaseSurfacePointer(event: React.PointerEvent<HTMLButtonElement>): void {
  event.preventDefault();
  event.currentTarget.releasePointerCapture?.(event.pointerId);
}

export const SimpleTriadsSurface: React.FC = () => {
  const {
    tonalCenter,
    selectedChord,
    activeSimpleTriadId,
    handleChordPointerDown,
    handleChordPointerUp,
    handleSimpleTriadPointerDown,
  } = useChordContext();

  const geometry = useMemo((): Triangle | null => {
    const earth = chordManager.getCoordinateForChord('Earth');
    const wind = chordManager.getCoordinateForChord('Wind');
    const fire = chordManager.getCoordinateForChord('Fire');
    if (!earth || !wind || !fire) return null;
    return { earth, wind, fire };
  }, []);

  const resolvedById = useMemo(() => {
    const byId = {} as Record<
      SimpleMajorTriadId,
      ReturnType<typeof resolveSimpleMajorTriad>
    >;
    for (const def of SIMPLE_MAJOR_TRIAD_DEFS) {
      byId[def.id] = resolveSimpleMajorTriad(def.id, tonalCenter);
    }
    return byId;
  }, [tonalCenter]);

  if (!geometry) {
    return (
      <div className="simple-triads" data-simple-triads="true">
        <p className="simple-triads__empty" role="status">
          Simple Major Triads could not locate the elemental triangle.
        </p>
      </div>
    );
  }

  const centroid = {
    x: (geometry.earth.x + geometry.wind.x + geometry.fire.x) / 3,
    y: (geometry.earth.y + geometry.wind.y + geometry.fire.y) / 3,
  };
  const parentSelected =
    activeSimpleTriadId == null ? selectedChord?.name ?? null : null;

  function bindParent(name: ParentElementName): {
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
    onPointerUp: () => void;
  } {
    const chord = chordManager.getChordByName(name);
    return {
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!chord) return;
        releaseSurfacePointer(event);
        handleChordPointerDown(chord);
      },
      onPointerUp: () => handleChordPointerUp(),
    };
  }

  return (
    <div
      className="simple-triads"
      data-simple-triads="true"
      role="group"
      aria-label="Simple Major Triads"
    >
      <svg
        className="simple-triads__frame"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="simple-triads-grad-earth-wind" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-earth)" />
            <stop offset="100%" stopColor="var(--color-wind)" />
          </linearGradient>
          <linearGradient id="simple-triads-grad-earth-fire" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-earth)" />
            <stop offset="100%" stopColor="var(--color-fire)" />
          </linearGradient>
          <linearGradient id="simple-triads-grad-wind-fire" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-wind)" />
            <stop offset="100%" stopColor="var(--color-fire)" />
          </linearGradient>
        </defs>
        {AXIS_ORDER.map((axis) => {
          const [fromKey, toKey] = AXIS_ENDS[axis];
          const from = geometry[fromKey];
          const to = geometry[toKey];
          const css = AXIS_CSS[axis];
          return (
            <line
              key={axis}
              className={`simple-triads__edge simple-triads__edge--${css}`}
              x1={from.x * 100}
              y1={from.y * 100}
              x2={to.x * 100}
              y2={to.y * 100}
            />
          );
        })}
      </svg>

      {AXIS_ORDER.map((axis) => {
        const { t, outset } = AXIS_LABEL_LAYOUT[axis];
        return (
          <p
            key={axis}
            className="simple-triads__axis-label"
            style={pct(offsetFromCentroid(axisPoint(geometry, axis, t), centroid, outset))}
          >
            {SIMPLE_TRIAD_AXIS_LABELS[axis]}
          </p>
        );
      })}

      {PARENT_ELEMENT_NAMES.map((name) => {
        const style = parentElementStyle(name);
        return (
          <button
            key={name}
            type="button"
            className="simple-triads__parent"
            data-simple-parent={name}
            style={{
              ...pct(geometry[PARENT_VERTEX[name]]),
              '--parent-fill': style.color,
              '--parent-glow': style.glow,
            } as React.CSSProperties}
            aria-label={name}
            aria-pressed={parentSelected === name}
            disabled={!chordManager.getChordByName(name)}
            {...bindParent(name)}
          >
            {name}
          </button>
        );
      })}

      {SIMPLE_MAJOR_TRIAD_DEFS.map((def) => {
        const resolved = resolvedById[def.id];
        const unavailable = resolved == null;
        const label = simpleTriadAriaLabel(def, tonalCenter);

        return (
          <button
            key={def.id}
            type="button"
            className={`simple-triads__rn simple-triads__rn--${AXIS_CSS[def.axis]}`}
            data-simple-triad={def.id}
            style={pct(axisPoint(geometry, def.axis, RN_EDGE_T[def.id]))}
            aria-label={label}
            aria-pressed={activeSimpleTriadId === def.id}
            aria-disabled={unavailable}
            disabled={unavailable}
            title={
              unavailable ? 'Triad unavailable at this tonal center' : label
            }
            onPointerDown={(event) => {
              if (unavailable) return;
              releaseSurfacePointer(event);
              handleSimpleTriadPointerDown(def.id);
            }}
            onPointerUp={() => handleChordPointerUp()}
          >
            <span className="simple-triads__rn-mark">{def.roman}</span>
            <span className="simple-triads__rn-caption">
              {formatSimpleTriadCaption(def, tonalCenter)}
            </span>
          </button>
        );
      })}
    </div>
  );
};
