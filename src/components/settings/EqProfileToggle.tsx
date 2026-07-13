import React from 'react';
import { useSoundDesignContext } from '../../context/SoundDesignContext';
import { OUTPUT_PROFILES, type EqProfileId } from '../../audio/outputProfiles';

const EQ_PROFILE_DESCRIPTIONS: Record<EqProfileId, string> = {
  smallSpeakers:
    'Optimized for phones and laptops. Boosts midrange presence and adds harmonic enhancement so low bass notes remain audible on small speakers.',
  largeSpeakers:
    'Tuned for studio monitors, subwoofers, car stereos, and PA systems. Adds low-end weight and gentle warmth without small-speaker translation.',
  flat:
    'Neutral reference with no EQ or harmonic enhancement. Best for exports to a DAW for further processing.',
};

const EQ_PROFILE_ORDER: EqProfileId[] = [
  'smallSpeakers',
  'largeSpeakers',
  'flat',
];

export const EqProfileToggle: React.FC = () => {
  const { eqProfileId, setEqProfileId } = useSoundDesignContext();

  return (
    <div className="eq-profile-toggle">
      <div className="memory-toggle">
          {EQ_PROFILE_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              className={`memory-btn ${eqProfileId === id ? 'active' : ''}`}
              onClick={() => setEqProfileId(id)}
              aria-pressed={eqProfileId === id}
            >
              {OUTPUT_PROFILES[id].label}
            </button>
          ))}
      </div>
      <p className="voice-leading-mode-desc" role="status" aria-live="polite">
        {EQ_PROFILE_DESCRIPTIONS[eqProfileId]}
      </p>
    </div>
  );
};
