import React from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import type { BorrowingDirection } from '../music/BorrowingLogic';
import { useChordContext } from '../context/ChordContext';

interface BorrowingControlsProps {
  disabled: boolean;
}

export const BorrowingControls: React.FC<BorrowingControlsProps> = ({ disabled }) => {
  const { borrowingState: state, handleBorrowingStateChange: onStateChange } = useChordContext();

  const handleBorrow = (line: number, direction: BorrowingDirection) => {
    if (disabled) return;
    
    const newState = { ...state };
    
    if (newState.borrowingDirections[line] === direction) {
      newState.borrowingDirections[line] = null;
      newState.circlePositions[line] = 'line';
    } else {
      newState.borrowingDirections[line] = direction;
      newState.circlePositions[line] = direction as 'up' | 'down';
    }
    
    onStateChange(newState);
  };

  const handleToggleNote = (line: number) => {
    if (disabled) return;
    
    const newState = { ...state };
    newState.noteStates[line] = newState.noteStates[line] === 'on' ? 'off' : 'on';
    onStateChange(newState);
  };

  const rows = [4, 3, 2, 1];

  return (
    <div className="borrowing-controls">
      {rows.map(line => (
        <div key={line} className="borrowing-row" style={{ opacity: disabled ? 0.5 : 1 }}>
          <button 
            className={`toggle-btn ${state.noteStates[line] === 'off' ? 'off' : ''}`}
            onClick={() => handleToggleNote(line)}
            disabled={disabled}
            title={state.noteStates[line] === 'on' ? "Mute Note" : "Unmute Note"}
          >
            {state.noteStates[line] === 'on' ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          
          <div className="note-label">Voice {line}</div>
          
          <div className="borrow-buttons">
            <button 
              className={`borrow-btn ${state.borrowingDirections[line] === 'up' ? 'active' : ''}`}
              onClick={() => handleBorrow(line, 'up')}
              disabled={disabled}
              title="Borrow Note Up"
            >
              <ChevronUp size={18} />
            </button>
            <button 
              className={`borrow-btn ${state.borrowingDirections[line] === 'down' ? 'active' : ''}`}
              onClick={() => handleBorrow(line, 'down')}
              disabled={disabled}
              title="Borrow Note Down"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
