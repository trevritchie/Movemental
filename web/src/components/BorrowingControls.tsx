import React from 'react';
import { ChevronUp, ChevronDown, Lock } from 'lucide-react';
import type { BorrowingDirection } from '../music/BorrowingLogic';
import { useChordContext } from '../context/ChordContext';

interface BorrowingControlsProps {
  disabled: boolean;
}

const VOICE_NAMES: Record<number, string> = {
  1: 'Root',
  2: '3rd',
  3: '5th',
  4: '6/7th',
};

export const BorrowingControls: React.FC<BorrowingControlsProps> = ({ disabled }) => {
  const { 
    borrowingState: state, 
    handleBorrowingStateChange: onStateChange,
    borrowingMemory,
    setBorrowingMemory,
    lockedVoices,
    toggleVoiceLock,
    selectedChord
  } = useChordContext();

  // Dynamic label for each voice, tailoring the 4th voice specifically based on the chord type
  const getVoiceLabel = (line: number): string => {
    if (line !== 4) return VOICE_NAMES[line];
    if (!selectedChord) return '6/7th';
    const name = selectedChord.name;
    const endsWithAny = (str: string, suffixes: string[]) => suffixes.some(s => str.endsWith(s));
    if (endsWithAny(name, ["Trunk", "Smoke", "Magma", "Branch", "Ember", "Glass"])) {
      return '6th';
    }
    if (endsWithAny(name, ["Sand-Storm", "Fire-Storm", "-Fire", "Leaf", "Flame", "Charcoal"])) {
      return '7th';
    }
    const trad = selectedChord.traditionalName;
    if (trad.includes("6")) return "6th";
    if (trad.includes("7")) return "7th";
    return '6/7th';
  };

  // Which "slot" is currently active for a line: 'up' | 'neutral' | 'down' | null (muted)
  const getActiveSlot = (line: number): 'up' | 'neutral' | 'down' | null => {
    if (state.noteStates[line] === 'off') return null;
    const dir = state.borrowingDirections[line];
    if (dir === 'up') return 'up';
    if (dir === 'down') return 'down';
    return 'neutral';
  };

  const handleClick = (line: number, slot: 'up' | 'neutral' | 'down') => {
    if (disabled) return;

    const newState = {
      ...state,
      borrowingDirections: { ...state.borrowingDirections },
      circlePositions: { ...state.circlePositions },
      noteStates: { ...state.noteStates },
    };

    const currentSlot = getActiveSlot(line);

    if (currentSlot === slot) {
      // Clicking the active button → mute
      newState.noteStates[line] = 'off';
    } else {
      // Unmute (if muted) and activate this slot
      newState.noteStates[line] = 'on';
      if (slot === 'neutral') {
        newState.borrowingDirections[line] = null;
        newState.circlePositions[line] = 'line';
      } else {
        newState.borrowingDirections[line] = slot as BorrowingDirection;
        newState.circlePositions[line] = slot;
      }
    }

    onStateChange(newState);
  };

  const handleToggleMute = (line: number) => {
    if (disabled) return;

    const newState = {
      ...state,
      borrowingDirections: { ...state.borrowingDirections },
      circlePositions: { ...state.circlePositions },
      noteStates: { ...state.noteStates },
    };

    if (state.noteStates[line] === 'off') {
      newState.noteStates[line] = 'on';
    } else {
      newState.noteStates[line] = 'off';
    }

    onStateChange(newState);
  };

  const rows = [4, 3, 2, 1];

  return (
    <div className="borrowing-controls">
      <div className="borrowing-header">
        <span className="borrowing-title">Voice Borrowing</span>
        <div className="memory-toggle">
          <button
            className={`memory-btn ${borrowingMemory === 'global' ? 'active' : ''}`}
            onClick={() => setBorrowingMemory('global')}
            title="Global: Borrowing state stays the same across all chords"
          >
            Global
          </button>
          <button
            className={`memory-btn ${borrowingMemory === 'per-chord' ? 'active' : ''}`}
            onClick={() => setBorrowingMemory('per-chord')}
            title="By Chord: Remember unique borrowing settings per chord"
          >
            By Chord
          </button>
        </div>
      </div>

      {rows.map(line => {
        const activeSlot = getActiveSlot(line);
        const muted = activeSlot === null;
        const isLocked = selectedChord ? (lockedVoices[selectedChord.name]?.[line] || false) : false;
        return (
          <div key={line} className={`borrowing-row${muted ? ' muted' : ''}`} style={{ opacity: disabled ? 0.5 : 1 }}>
            <div className="voice-label-wrapper">
              <div 
                className="voice-label-container" 
                onClick={() => handleToggleMute(line)}
                style={{ cursor: disabled ? 'default' : 'pointer' }}
              >
                <div className={`power-led ${muted ? 'off' : 'on'}`} />
                <div className="note-label">{getVoiceLabel(line)}</div>
              </div>
              
              {selectedChord && !disabled && (
                <button
                  className={`lock-toggle-btn ${isLocked ? 'locked' : 'unlocked'}`}
                  onClick={() => toggleVoiceLock(selectedChord.name, line)}
                  title={isLocked ? "Voice Locked to Chord (click to unlock)" : "Lock Voice to Chord"}
                >
                  <Lock size={11} />
                </button>
              )}
            </div>

            <div className="borrow-buttons">
              <button
                className={`borrow-btn borrow-btn-up ${activeSlot === 'up' ? 'active' : ''}`}
                onClick={() => handleClick(line, 'up')}
                disabled={disabled}
                title="Borrow Note Up"
              >
                <ChevronUp size={16} />
              </button>
              <button
                className={`borrow-btn borrow-btn-neutral ${activeSlot === 'neutral' ? 'active' : ''}`}
                onClick={() => handleClick(line, 'neutral')}
                disabled={disabled}
                title="Default (no borrow) — click to mute if active"
              >
                –
              </button>
              <button
                className={`borrow-btn borrow-btn-down ${activeSlot === 'down' ? 'active' : ''}`}
                onClick={() => handleClick(line, 'down')}
                disabled={disabled}
                title="Borrow Note Down"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
