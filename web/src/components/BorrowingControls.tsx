import React, { useRef, useCallback } from 'react';
import type { BorrowingDirection, BorrowingState } from '../music/BorrowingLogic';
import { useChordContext } from '../context/ChordContext';
import { useLayoutTier } from '../hooks/useLayoutTier';
import { ELEMENTAL_RELATIONSHIPS } from '../music/config';
import { MobileActionButtons } from './SettingsMenu';

interface BorrowingControlsProps {
  disabled: boolean;
}

const ELEMENT_COLORS: Record<string, string> = {
  Earth: 'var(--color-earth)',
  Wind:  'var(--color-wind)',
  Fire:  'var(--color-fire)',
};

const VOICE_LINES = [1, 2, 3, 4] as const;

/** Vertical track thirds: up (top), neutral (middle), down (bottom). */
const SLIDER_ZONE_TOP = 0.33;
const SLIDER_ZONE_BOTTOM = 0.67;

/** Shallow-copy nested borrowing maps before mutating one voice line. */
function cloneBorrowingState(state: BorrowingState): BorrowingState {
  return {
    ...state,
    borrowingDirections: { ...state.borrowingDirections },
    circlePositions: { ...state.circlePositions },
    noteStates: { ...state.noteStates },
  };
}

// ─── 3-node vertical slider ───────────────────────────────────────────────────

interface BorrowSliderProps {
  activeSlot: 'up' | 'neutral' | 'down';
  muted: boolean;
  disabled: boolean;
  onChange: (slot: 'up' | 'neutral' | 'down') => void;
  onToggleMute: () => void;
  neutralColor: string;
  oppositeColor: string;
}

const SLOTS: ('up' | 'neutral' | 'down')[] = ['up', 'neutral', 'down'];

const BorrowSlider: React.FC<BorrowSliderProps> = ({
  activeSlot, muted, disabled, onChange, onToggleMute, neutralColor, oppositeColor,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const didMove = useRef(false);
  const initialSlotOnDown = useRef<'up' | 'neutral' | 'down' | null>(null);
  const clickedActiveNode = useRef(false);

  const getSlotFromY = (clientY: number): 'down' | 'neutral' | 'up' => {
    if (!trackRef.current) return 'neutral';
    const { top, height } = trackRef.current.getBoundingClientRect();
    const ratio = (clientY - top) / height;
    if (ratio < SLIDER_ZONE_TOP) return 'up';
    if (ratio > SLIDER_ZONE_BOTTOM) return 'down';
    return 'neutral';
  };

  const colorForSlot = (slot: 'down' | 'neutral' | 'up') =>
    slot === 'neutral' ? neutralColor : oppositeColor;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    isDragging.current = true;
    didMove.current = false;

    const slot = getSlotFromY(e.clientY);
    initialSlotOnDown.current = slot;
    clickedActiveNode.current = (!muted && slot === activeSlot);

    e.currentTarget.setPointerCapture(e.pointerId);

    if (slot !== activeSlot || muted) {
      onChange(slot);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || disabled) return;
    const slot = getSlotFromY(e.clientY);

    if (slot !== initialSlotOnDown.current) {
      didMove.current = true;
    }
    onChange(slot);
  };

  const stopDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || disabled) return;

    const endSlot = getSlotFromY(e.clientY);

    if (
      clickedActiveNode.current &&
      !didMove.current &&
      endSlot === initialSlotOnDown.current
    ) {
      onToggleMute();
    }

    isDragging.current = false;
  };

  return (
    <div
      ref={trackRef}
      className={`borrow-slider${muted ? ' muted' : ''}${disabled ? ' disabled' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      <div className="borrow-slider-track" />

      {SLOTS.map((slot) => {
        const isActive = activeSlot === slot;
        const color = colorForSlot(slot);
        return (
          <div
            key={slot}
            className={`borrow-node${isActive ? ' active' : ''}`}
            style={{ '--node-color': color } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const BorrowingControls: React.FC<BorrowingControlsProps> = ({
  disabled,
}) => {
  const {
    borrowingState: state,
    handleBorrowingStateChange: onStateChange,
    selectedChord,
    tonalCenter,
  } = useChordContext();

  const isPhone = useLayoutTier() === 'phone';

  const oppositeElementName = selectedChord
    ? (ELEMENTAL_RELATIONSHIPS[selectedChord.name]?.[0] ?? null)
    : null;
  const oppositeColor = oppositeElementName
    ? (ELEMENT_COLORS[oppositeElementName] ?? 'rgba(255,255,255,0.45)')
    : 'rgba(255,255,255,0.45)';

  const getNeutralColor = useCallback((line: number): string => {
    if (!selectedChord) return 'rgba(255,255,255,0.45)';
    const rootIdx = selectedChord.rootPositionIndex;
    const mapping: Record<number, number> = {
      1: rootIdx,
      2: (rootIdx + 1) % 4,
      3: (rootIdx + 2) % 4,
      4: (rootIdx + 3) % 4,
    };
    const idx = mapping[line];
    if (idx >= selectedChord.pitches.length) {
      return 'rgba(255,255,255,0.45)';
    }
    const pitch = selectedChord.pitches[idx];
    const relPc = ((pitch % 12) - tonalCenter + 12) % 12;
    const rem = relPc % 3;
    if (rem === 0) return 'var(--color-earth)';
    if (rem === 1) return 'var(--color-wind)';
    return 'var(--color-fire)';
  }, [selectedChord, tonalCenter]);

  const getSliderSlot = useCallback(
    (line: number): 'up' | 'neutral' | 'down' => {
      const dir = state.borrowingDirections[line];
      if (dir === 'up') return 'up';
      if (dir === 'down') return 'down';
      return 'neutral';
    },
    [state.borrowingDirections]
  );

  const handleToggleMute = useCallback(
    (line: number) => {
      if (disabled) return;
      onStateChange({
        ...cloneBorrowingState(state),
        noteStates: {
          ...state.noteStates,
          [line]: state.noteStates[line] === 'off' ? 'on' : 'off',
        },
      });
    },
    [disabled, state, onStateChange]
  );

  const handleSliderChange = useCallback(
    (line: number, slot: 'up' | 'neutral' | 'down') => {
      if (disabled) return;
      const newState = cloneBorrowingState(state);
      newState.noteStates[line] = 'on';
      if (slot === 'neutral') {
        newState.borrowingDirections[line] = null;
        newState.circlePositions[line] = 'line';
      } else {
        newState.borrowingDirections[line] = slot as BorrowingDirection;
        newState.circlePositions[line] = slot;
      }
      onStateChange(newState);
    },
    [disabled, state, onStateChange]
  );

  const rowOpacity = disabled ? 0.5 : 1;
  const sliderColClass = isPhone ? 'mobile-voice-slider-col' : 'borrowing-slider-col';

  const renderSliderColumn = (line: number) => {
    const muted = state.noteStates[line] === 'off';

    return (
      <div
        key={line}
        className={sliderColClass}
        style={{ opacity: rowOpacity }}
      >
        <BorrowSlider
          activeSlot={getSliderSlot(line)}
          muted={muted}
          disabled={disabled}
          onChange={(slot) => handleSliderChange(line, slot)}
          onToggleMute={() => handleToggleMute(line)}
          neutralColor={getNeutralColor(line)}
          oppositeColor={oppositeColor}
        />
      </div>
    );
  };

  if (isPhone) {
    return (
      <div className="borrowing-controls borrowing-controls--phone">
        <div className="mobile-voice-panel">
          <MobileActionButtons side="left" />
          <div className="mobile-voice-sliders">
            {VOICE_LINES.map((line) => renderSliderColumn(line))}
          </div>
          <MobileActionButtons side="right" />
        </div>
      </div>
    );
  }

  return (
    <div className="borrowing-controls">
      {VOICE_LINES.map((line) => renderSliderColumn(line))}
    </div>
  );
};
