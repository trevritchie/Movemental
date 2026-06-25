import React from 'react';
import { useChordContext } from '../../context/ChordContext';
import type { VoiceLeadingMode } from '../../context/types';

const VOICE_LEADING_MODE_DESCRIPTIONS: Record<VoiceLeadingMode, string> = {
  root_position:
    'Phone flat: double-octave voicing with the root in the bass on every chord. Pitch and roll still move the voicing from that starting point.',
  smooth:
    'Each chord has a fixed bass degree when the phone is flat. Tilting shifts from that resting point the same way every time, no matter which chords you played before.',
  smoothest:
    'On each chord change, picks the inversion that moves voices the fewest semitones from the chord you just played. The result depends on your path through the diagram.',
};

export const VoiceLeadingToggle: React.FC = () => {
  const { voiceLeadingMode, setVoiceLeadingMode } = useChordContext();

  return (
    <div className="voice-leading-toggle">
      <div className="memory-toggle">
        <button
          type="button"
          className={`memory-btn ${voiceLeadingMode === 'root_position' ? 'active' : ''}`}
          onClick={() => setVoiceLeadingMode('root_position')}
          aria-pressed={voiceLeadingMode === 'root_position'}
        >
          Root Position
        </button>
        <button
          type="button"
          className={`memory-btn ${voiceLeadingMode === 'smooth' ? 'active' : ''}`}
          onClick={() => setVoiceLeadingMode('smooth')}
          aria-pressed={voiceLeadingMode === 'smooth'}
        >
          Smooth
        </button>
        <button
          type="button"
          className={`memory-btn ${voiceLeadingMode === 'smoothest' ? 'active' : ''}`}
          onClick={() => setVoiceLeadingMode('smoothest')}
          aria-pressed={voiceLeadingMode === 'smoothest'}
        >
          Smoothest
        </button>
      </div>
      <p className="voice-leading-mode-desc" role="status" aria-live="polite">
        {VOICE_LEADING_MODE_DESCRIPTIONS[voiceLeadingMode]}
      </p>
    </div>
  );
};
