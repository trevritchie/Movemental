import React from 'react';
import { useChordContext } from '../../context/ChordContext';
import type { VoiceLeadingMode } from '../../music/sessionModes';

const VOICE_LEADING_MODE_DESCRIPTIONS: Record<VoiceLeadingMode, string> = {
  root_position: 'The starting inversion is always root in the bass.',
  smooth:
    'Each chord has its own starting inversion. This provides smoother voice leading while remaining predictable.',
  smoothest:
    'The starting inversion is set dynamically so that notes move the least distance possible from the previous chord. Different paths around the diagram yield different results.',
};

export const VoiceLeadingToggle: React.FC = () => {
  const { voiceLeadingMode, setVoiceLeadingMode, tiltModeEnabled } =
    useChordContext();

  const startingInversionHint = tiltModeEnabled
    ? 'When switching chords, choose how each chord\'s "starting inversion" is set: the IN THE BASS value that plays when your phone is flat, like on a table.'
    : 'When switching chords, choose how each chord\'s "starting inversion" is set: the IN THE BASS value that plays if you haven\'t applied the lock on the dropdown.';

  return (
    <div className="voice-leading-toggle">
      <p className="settings-menu-section__hint">{startingInversionHint}</p>
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
