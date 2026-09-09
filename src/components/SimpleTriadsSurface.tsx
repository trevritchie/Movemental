/**
 * Opt-in Simple Major Triads play surface: triangle vertices stay as the
 * Earth / Wind / Fire parents; large Roman-numeral buttons sit on the axes.
 */
import React, { useMemo } from 'react';
import { useChordContext } from '../context/ChordContext';
import { chordManager } from '../music/ChordManager';
import { parentElementStyle } from '../music/elementTokens';
import {
  formatSimpleTriadCaption,
  SIMPLE_MAJOR_TRIAD_DEFS,
  SIMPLE_TRIAD_AXIS_LABELS,
  resolveSimpleMajorTriad,
  simpleTriadAriaLabel,
  type SimpleTriadAxisId,
} from '../music/simpleMajorTriads';

type Point = { x: number; y: number };

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

const RN_EDGE_T: Record<string, number> = {
  I: 0.3,
  vi: 0.7,
  ii: 0.22,
  IV: 0.48,
  vii_dim: 0.74,
  iii: 0.32,
  V: 0.68,
};

const AXIS_LABEL_T: Record<SimpleTriadAxisId, number> = {
  earth_wind: 0.5,
  earth_fire: 0.12,
  wind_fire: 0.12,
};

function axisClass(axis: SimpleTriadAxisId): string {
  if (axis === 'earth_wind') return 'simple-triads__rn--earth-wind';
  if (axis === 'earth_fire') return 'simple-triads__rn--earth-fire';
  return 'simple-triads__rn--wind-fire';
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

  const geometry = useMemo(() => {
    const earth = chordManager.getCoordinateForChord('Earth');
    const wind = chordManager.getCoordinateForChord('Wind');
    const fire = chordManager.getCoordinateForChord('Fire');
    if (!earth || !wind || !fire) return null;
    return { earth, wind, fire };
  }, [tonalCenter]);

  const resolvedById = useMemo(() => {
    return Object.fromEntries(
      SIMPLE_MAJOR_TRIAD_DEFS.map((def) => [
        def.id,
        resolveSimpleMajorTriad(def.id, tonalCenter),
      ]),
    );
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

  const { earth, wind, fire } = geometry;
  const parentSelected =
    activeSimpleTriadId == null ? selectedChord?.name ?? null : null;

  const bindParent = (name: 'Earth' | 'Wind' | 'Fire') => {
    const chord = chordManager.getChordByName(name);
    return {
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!chord) return;
        event.preventDefault();
        event.currentTarget.releasePointerCapture(event.pointerId);
        handleChordPointerDown(chord);
      },
      onPointerUp: () => handleChordPointerUp(),
    };
  };

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
        <line
          className="simple-triads__edge simple-triads__edge--earth-wind"
          x1={earth.x * 100}
          y1={earth.y * 100}
          x2={wind.x * 100}
          y2={wind.y * 100}
        />
        <line
          className="simple-triads__edge simple-triads__edge--earth-fire"
          x1={earth.x * 100}
          y1={earth.y * 100}
          x2={fire.x * 100}
          y2={fire.y * 100}
        />
        <line
          className="simple-triads__edge simple-triads__edge--wind-fire"
          x1={wind.x * 100}
          y1={wind.y * 100}
          x2={fire.x * 100}
          y2={fire.y * 100}
        />
      </svg>

      <p
        className="simple-triads__axis-label"
        style={pct(lerp(earth, wind, AXIS_LABEL_T.earth_wind))}
      >
        {SIMPLE_TRIAD_AXIS_LABELS.earth_wind}
      </p>
      <p
        className="simple-triads__axis-label"
        style={pct(lerp(earth, fire, AXIS_LABEL_T.earth_fire))}
      >
        {SIMPLE_TRIAD_AXIS_LABELS.earth_fire}
      </p>
      <p
        className="simple-triads__axis-label"
        style={pct(lerp(wind, fire, AXIS_LABEL_T.wind_fire))}
      >
        {SIMPLE_TRIAD_AXIS_LABELS.wind_fire}
      </p>

      {(['Earth', 'Wind', 'Fire'] as const).map((name) => {
        const point = geometry[name.toLowerCase() as 'earth' | 'wind' | 'fire'];
        const style = parentElementStyle(name);
        return (
          <button
            key={name}
            type="button"
            className="simple-triads__parent"
            data-simple-parent={name}
            style={{
              ...pct(point),
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
        const from = def.axis === 'earth_wind'
          ? earth
          : def.axis === 'earth_fire'
            ? earth
            : wind;
        const to = def.axis === 'earth_wind'
          ? wind
          : fire;
        const point = lerp(from, to, RN_EDGE_T[def.id] ?? 0.5);
        const unavailable = resolved == null;

        return (
          <button
            key={def.id}
            type="button"
            className={`simple-triads__rn ${axisClass(def.axis)}`}
            data-simple-triad={def.id}
            style={pct(point)}
            aria-label={simpleTriadAriaLabel(def, tonalCenter)}
            aria-pressed={activeSimpleTriadId === def.id}
            aria-disabled={unavailable}
            disabled={unavailable}
            title={
              unavailable
                ? 'Triad unavailable at this tonal center'
                : simpleTriadAriaLabel(def, tonalCenter)
            }
            onPointerDown={(event) => {
              if (unavailable) return;
              event.preventDefault();
              event.currentTarget.releasePointerCapture(event.pointerId);
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
