import React from 'react';
import { useChordContext } from '../../context/ChordContext';
import { OUTPUT_PROFILES } from '../../audio/outputProfiles';
import { useLayoutTier } from '../../hooks/useLayoutTier';

const OUTPUT_PROFILE_DESCRIPTIONS = {
  smallSpeakers:
    'Optimized for phones and laptops. Boosts midrange presence and adds harmonic enhancement so low bass notes remain audible on small speakers.',
  studio:
    'Flat reference mix for headphones, monitors, and subwoofers. Full-range EQ with no bass enhancement.',
} as const;

const DESKTOP_DEFAULT_HINT =
  'Defaults to Studio on desktop. Choose Small Speakers for phone-style translation.';

export const OutputProfileToggle: React.FC = () => {
  const { outputProfileId, setOutputProfileId } = useChordContext();
  const layoutTier = useLayoutTier();

  return (
    <div className="output-profile-toggle">
      <div className="memory-toggle">
        <button
          type="button"
          className={`memory-btn ${outputProfileId === 'smallSpeakers' ? 'active' : ''}`}
          onClick={() => setOutputProfileId('smallSpeakers')}
          aria-pressed={outputProfileId === 'smallSpeakers'}
        >
          {OUTPUT_PROFILES.smallSpeakers.label}
        </button>
        <button
          type="button"
          className={`memory-btn ${outputProfileId === 'studio' ? 'active' : ''}`}
          onClick={() => setOutputProfileId('studio')}
          aria-pressed={outputProfileId === 'studio'}
        >
          {OUTPUT_PROFILES.studio.label}
        </button>
      </div>
      {layoutTier === 'desktop' && (
        <p className="voice-leading-mode-desc" role="status">
          {DESKTOP_DEFAULT_HINT}
        </p>
      )}
      <p className="voice-leading-mode-desc" role="status" aria-live="polite">
        {OUTPUT_PROFILE_DESCRIPTIONS[outputProfileId]}
      </p>
    </div>
  );
};
