import React from 'react';
import { useChordContext } from '../../context/ChordContext';
import type { ShortestNote } from '../../settings/userSettingsSchema';

const OPTIONS: Array<{ value: ShortestNote; label: string }> = [
  { value: '16n', label: '1/16' },
  { value: '8n', label: '1/8' },
  { value: '4n', label: '1/4' },
];

export const ShortestNoteToggle: React.FC = () => {
  const { shortestNote, setShortestNote } = useChordContext();

  return (
    <div className="shortest-note-toggle">
      <div className="memory-toggle" role="group" aria-label="Shortest Note">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`memory-btn ${shortestNote === value ? 'active' : ''}`}
            onClick={() => setShortestNote(value)}
            aria-pressed={shortestNote === value}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
