import React from 'react';
import { useChordContext } from '../../context/ChordContext';

export const BorrowingMemoryToggle: React.FC = () => {
  const { borrowingMemory, setBorrowingMemory } = useChordContext();

  return (
    <div className="memory-toggle">
      <button
        type="button"
        className={`memory-btn ${borrowingMemory === 'per-chord' ? 'active' : ''}`}
        onClick={() => setBorrowingMemory('per-chord')}
        title="Per Chord: Remember unique borrowing settings per chord"
      >
        Per Chord
      </button>
      <button
        type="button"
        className={`memory-btn ${borrowingMemory === 'global' ? 'active' : ''}`}
        onClick={() => setBorrowingMemory('global')}
        title="Global: Borrowing state stays the same across all chords"
      >
        Global
      </button>
    </div>
  );
};
