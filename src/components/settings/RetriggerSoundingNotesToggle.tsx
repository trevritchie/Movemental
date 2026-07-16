import React from 'react';
import { useChordContext } from '../../context/ChordContext';

export const RetriggerSoundingNotesToggle: React.FC = () => {
  const { retriggerSoundingNotes, setRetriggerSoundingNotes } =
    useChordContext();

  return (
    <div className="retrigger-sounding-notes-toggle">
      <div className="memory-toggle">
        <button
          type="button"
          className={`memory-btn ${!retriggerSoundingNotes ? 'active' : ''}`}
          onClick={() => setRetriggerSoundingNotes(false)}
          aria-pressed={!retriggerSoundingNotes}
        >
          Off
        </button>
        <button
          type="button"
          className={`memory-btn ${retriggerSoundingNotes ? 'active' : ''}`}
          onClick={() => setRetriggerSoundingNotes(true)}
          aria-pressed={retriggerSoundingNotes}
        >
          On
        </button>
      </div>
    </div>
  );
};
