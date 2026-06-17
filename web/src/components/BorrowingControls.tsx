import React, { useRef } from 'react';
import { Lock } from 'lucide-react';
import type { BorrowingDirection } from '../music/BorrowingLogic';
import { getVoiceDegreeLabel } from '../music/voiceDegreeLabel';
import { useChordContext } from '../context/ChordContext';
import { ELEMENTAL_RELATIONSHIPS } from '../music/config';

interface BorrowingControlsProps {
  disabled: boolean;
}


const ELEMENT_COLORS: Record<string, string> = {
  Earth: 'var(--color-earth)',
  Wind:  'var(--color-wind)',
  Fire:  'var(--color-fire)',
};

// ─── 3-node slider ───────────────────────────────────────────────────────────

interface BorrowSliderProps {
  activeSlot: 'up' | 'neutral' | 'down';
  muted: boolean;
  disabled: boolean;
  onChange: (slot: 'up' | 'neutral' | 'down') => void;
  onToggleMute: () => void;
  neutralColor: string;  // color of the voice's own natural note
  oppositeColor: string; // color of the chord's opposite element
}

const SLOTS: ('down' | 'neutral' | 'up')[] = ['down', 'neutral', 'up'];

const BorrowSlider: React.FC<BorrowSliderProps> = ({
  activeSlot, muted, disabled, onChange, onToggleMute, neutralColor, oppositeColor,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const didMove = useRef(false);
  const initialSlotOnDown = useRef<'up' | 'neutral' | 'down' | null>(null);
  const clickedActiveNode = useRef(false);

  const getSlotFromX = (clientX: number): 'down' | 'neutral' | 'up' => {
    if (!trackRef.current) return 'neutral';
    const { left, width } = trackRef.current.getBoundingClientRect();
    const ratio = (clientX - left) / width;
    if (ratio < 0.33) return 'down';
    if (ratio > 0.67) return 'up';
    return 'neutral';
  };

  const colorForSlot = (slot: 'down' | 'neutral' | 'up') =>
    slot === 'neutral' ? neutralColor : oppositeColor;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    isDragging.current = true;
    didMove.current = false;
    
    const slot = getSlotFromX(e.clientX);
    initialSlotOnDown.current = slot;
    // Track if the user explicitly clicked the node that is already actively emitting sound
    clickedActiveNode.current = (!muted && slot === activeSlot);

    e.currentTarget.setPointerCapture(e.pointerId);

    // If we click a new slot OR it's currently muted, 
    // immediately trigger a change (which turns it on in the parent).
    if (slot !== activeSlot || muted) {
      onChange(slot);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || disabled) return;
    const slot = getSlotFromX(e.clientX);
    
    if (slot !== initialSlotOnDown.current) {
      didMove.current = true;
    }
    onChange(slot);
  };

  const stopDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || disabled) return;
    
    const endSlot = getSlotFromX(e.clientX);
    
    // Toggle logic:
    // If it was a clean click (no slot move) exactly on the originally active node
    if (clickedActiveNode.current && !didMove.current && endSlot === initialSlotOnDown.current) {
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
      {/* Track line drawn behind nodes */}
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

const ROWS = [4, 3, 2, 1];

// ─── Main component ───────────────────────────────────────────────────────────

export const BorrowingControls: React.FC<BorrowingControlsProps> = ({ disabled }) => {
  const {
    borrowingState: state,
    handleBorrowingStateChange: onStateChange,
    borrowingMemory,
    setBorrowingMemory,
    lockedVoices,
    toggleVoiceLock,
    selectedChord,
    tonalCenter,
  } = useChordContext();

  const getVoiceLabel = React.useCallback(
    (line: number): string =>
      getVoiceDegreeLabel(line as 1 | 2 | 3 | 4, selectedChord),
    [selectedChord]
  );

  // Color of the chord's opposite (borrowed-from) element
  const oppositeElementName = selectedChord
    ? (ELEMENTAL_RELATIONSHIPS[selectedChord.name]?.[0] ?? null)
    : null;
  const oppositeColor = oppositeElementName
    ? (ELEMENT_COLORS[oppositeElementName] ?? 'rgba(255,255,255,0.45)')
    : 'rgba(255,255,255,0.45)';

  // Natural element color of a voice's home note (for the neutral node)
  const getNeutralColor = React.useCallback((line: number): string => {
    if (!selectedChord) return 'rgba(255,255,255,0.45)';
    const rootIdx = selectedChord.rootPositionIndex;
    const mapping: Record<number, number> = {
      1: rootIdx,
      2: (rootIdx + 1) % 4,
      3: (rootIdx + 2) % 4,
      4: (rootIdx + 3) % 4,
    };
    const idx = mapping[line];
    if (idx >= selectedChord.pitches.length) return 'rgba(255,255,255,0.45)';
    const pitch = selectedChord.pitches[idx];
    const relPc = ((pitch % 12) - tonalCenter + 12) % 12;
    const rem = relPc % 3;
    if (rem === 0) return 'var(--color-earth)';
    if (rem === 1) return 'var(--color-wind)';
    return 'var(--color-fire)';
  }, [selectedChord, tonalCenter]);

  // Current slider position — always 'up'|'neutral'|'down', independent of mute
  const getSliderSlot = React.useCallback((line: number): 'up' | 'neutral' | 'down' => {
    const dir = state.borrowingDirections[line];
    if (dir === 'up') return 'up';
    if (dir === 'down') return 'down';
    return 'neutral';
  }, [state.borrowingDirections]);

  const handleToggleMute = React.useCallback((line: number) => {
    if (disabled) return;
    onStateChange({
      ...state,
      borrowingDirections: { ...state.borrowingDirections },
      circlePositions: { ...state.circlePositions },
      noteStates: {
        ...state.noteStates,
        [line]: state.noteStates[line] === 'off' ? 'on' : 'off',
      },
    });
  }, [disabled, state, onStateChange]);

  // Slider change — always unmutes the voice
  const handleSliderChange = React.useCallback((line: number, slot: 'up' | 'neutral' | 'down') => {
    if (disabled) return;
    const newState = {
      ...state,
      borrowingDirections: { ...state.borrowingDirections },
      circlePositions: { ...state.circlePositions },
      noteStates: { ...state.noteStates, [line]: 'on' as const },
    };
    if (slot === 'neutral') {
      newState.borrowingDirections[line] = null;
      newState.circlePositions[line] = 'line';
    } else {
      newState.borrowingDirections[line] = slot as BorrowingDirection;
      newState.circlePositions[line] = slot;
    }
    onStateChange(newState);
  }, [disabled, state, onStateChange]);

  return (
    <div className="borrowing-controls">
      <div className="borrowing-header">
        <span className="borrowing-title">Voice Borrowing</span>
        <div className="memory-toggle">
          <button
            className={`memory-btn ${borrowingMemory === 'per-chord' ? 'active' : ''}`}
            onClick={() => setBorrowingMemory('per-chord')}
            title="Per Chord: Remember unique borrowing settings per chord"
          >Per Chord</button>
          <button
            className={`memory-btn ${borrowingMemory === 'global' ? 'active' : ''}`}
            onClick={() => setBorrowingMemory('global')}
            title="Global: Borrowing state stays the same across all chords"
          >Global</button>
        </div>
      </div>

      {ROWS.map(line => {
        const muted = state.noteStates[line] === 'off';
        const isLocked = selectedChord
          ? (lockedVoices[selectedChord.name]?.[line] || false)
          : false;

        return (
          <div
            key={line}
            className={`borrowing-row${muted ? ' muted' : ''}`}
            style={{ opacity: disabled ? 0.5 : 1 }}
          >
            <div className="voice-label-wrapper">
              <div
                className="voice-label-container"
                onClick={() => handleToggleMute(line)}
                style={{ cursor: disabled ? 'default' : 'pointer' }}
                title="Mute removes this pitch class from the entire voicing (all octaves)"
              >
                <div className={`power-led ${muted ? 'off' : 'on'}`} />
                <div className="note-label">{getVoiceLabel(line)}</div>
              </div>

              {selectedChord && !disabled && (
                <button
                  className={`lock-toggle-btn ${isLocked ? 'locked' : 'unlocked'}`}
                  onClick={() => toggleVoiceLock(selectedChord.name, line)}
                  title={isLocked ? 'Voice Locked to Chord (click to unlock)' : 'Lock Voice to Chord'}
                >
                  <Lock size={10} />
                </button>
              )}
            </div>

            <div className="slider-wrapper">
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
          </div>
        );
      })}
    </div>
  );
};
