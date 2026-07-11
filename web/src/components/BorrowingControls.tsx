import React, { useRef, useCallback } from 'react';
import type { BorrowingDirection } from '../music/BorrowingLogic';
import { borrowingLogic, cloneBorrowingState } from '../music/BorrowingLogic';
import { useChordContext } from '../context/ChordContext';
import { useLayoutTier } from '../hooks/useLayoutTier';
import { isPageInteractiveForAudio } from '../audio/pageInteraction';
import { ELEMENTAL_RELATIONSHIPS } from '../music/config';
import {
  cssColorForRelativePc,
  parentElementColor,
} from '../music/elementTokens';
import { relativePitchClass } from '../music/pitchClass';
import { MobileActionButtons } from './AppToolbar';

interface BorrowingControlsProps {
  disabled: boolean;
}

const VOICE_LINES = [1, 2, 3, 4] as const;

/** Vertical track thirds: up (top), neutral (middle), down (bottom). */
const SLIDER_ZONE_TOP = 0.33;
const SLIDER_ZONE_BOTTOM = 0.67;

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

/** Debounce borrowing preview so OS dismiss gestures can cancel before audio. */
const SLIDER_PREVIEW_DEBOUNCE_MS = 100;

const BorrowSlider = React.memo(function BorrowSlider({
  activeSlot, muted, disabled, onChange, onToggleMute, neutralColor, oppositeColor,
}: BorrowSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const didMove = useRef(false);
  const initialSlotOnDown = useRef<'up' | 'neutral' | 'down' | null>(null);
  const clickedActiveNode = useRef(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSlotRef = useRef<'up' | 'neutral' | 'down' | null>(null);

  const cancelScheduledPreview = () => {
    if (previewTimerRef.current !== null) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    pendingSlotRef.current = null;
  };

  const commitPreview = (slot: 'up' | 'neutral' | 'down') => {
    cancelScheduledPreview();
    onChange(slot);
  };

  const schedulePreview = (slot: 'up' | 'neutral' | 'down') => {
    pendingSlotRef.current = slot;
    if (previewTimerRef.current !== null) {
      clearTimeout(previewTimerRef.current);
    }
    previewTimerRef.current = setTimeout(() => {
      previewTimerRef.current = null;
      if (!isDragging.current || pendingSlotRef.current === null) {
        return;
      }
      if (!isPageInteractiveForAudio()) {
        pendingSlotRef.current = null;
        return;
      }
      onChange(pendingSlotRef.current);
      pendingSlotRef.current = null;
    }, SLIDER_PREVIEW_DEBOUNCE_MS);
  };

  const flushPendingPreview = () => {
    if (pendingSlotRef.current !== null) {
      commitPreview(pendingSlotRef.current);
    }
  };

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
    cancelScheduledPreview();
    isDragging.current = true;
    didMove.current = false;

    const slot = getSlotFromY(e.clientY);
    initialSlotOnDown.current = slot;
    clickedActiveNode.current = (!muted && slot === activeSlot);

    try {
      if (typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } catch {
      // Some test environments and browsers reject capture.
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || disabled) return;
    const slot = getSlotFromY(e.clientY);

    if (slot !== initialSlotOnDown.current) {
      didMove.current = true;
    }
    if (didMove.current && (slot !== activeSlot || muted)) {
      schedulePreview(slot);
    }
  };

  const abortDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || disabled) return;
    cancelScheduledPreview();
    isDragging.current = false;
    didMove.current = false;
    initialSlotOnDown.current = null;
    clickedActiveNode.current = false;
    try {
      if (
        typeof e.currentTarget.hasPointerCapture === 'function' &&
        e.currentTarget.hasPointerCapture(e.pointerId)
      ) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Pointer may already be released by the browser.
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || disabled) return;

    const endSlot = getSlotFromY(e.clientY);

    if (didMove.current) {
      flushPendingPreview();
    } else if (endSlot !== activeSlot || muted) {
      commitPreview(endSlot);
    } else if (
      clickedActiveNode.current &&
      endSlot === initialSlotOnDown.current
    ) {
      onToggleMute();
    }

    cancelScheduledPreview();
    isDragging.current = false;
    didMove.current = false;
    initialSlotOnDown.current = null;
    clickedActiveNode.current = false;
  };

  return (
    <div
      ref={trackRef}
      className={`borrow-slider${muted ? ' muted' : ''}${disabled ? ' disabled' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={abortDrag}
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
});

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
    ? (parentElementColor(oppositeElementName) ?? 'rgba(255,255,255,0.45)')
    : 'rgba(255,255,255,0.45)';

  const getNeutralColor = useCallback((line: number): string => {
    if (!selectedChord) return 'rgba(255,255,255,0.45)';
    const mapping = borrowingLogic.getRootPositionMapping(selectedChord);
    const idx = mapping[line];
    if (idx >= selectedChord.pitches.length) {
      return 'rgba(255,255,255,0.45)';
    }
    const pitch = selectedChord.pitches[idx];
    return cssColorForRelativePc(relativePitchClass(pitch, tonalCenter));
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
      <div
        className="borrowing-controls borrowing-controls--phone"
        data-tour-id="tour-borrowing"
      >
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
    <div className="borrowing-controls" data-tour-id="tour-borrowing">
      {VOICE_LINES.map((line) => renderSliderColumn(line))}
    </div>
  );
};
