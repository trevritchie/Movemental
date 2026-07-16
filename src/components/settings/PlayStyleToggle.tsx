import React from 'react';
import { useChordContext } from '../../context/ChordContext';
import { useLayoutTier } from '../../hooks/useLayoutTier';

export const PlayStyleToggle: React.FC = () => {
  const { playStyle, setPlayStyle } = useChordContext();
  const layoutTier = useLayoutTier();
  const isDesktop = layoutTier === 'desktop';
  const tapLabel = isDesktop ? 'Click' : 'Tap';
  const holdLabel = isDesktop ? 'Click & Hold' : 'Tap & Hold';

  return (
    <div className="memory-toggle">
      <button
        type="button"
        className={`memory-btn ${playStyle === 'tap' ? 'active' : ''}`}
        onClick={() => setPlayStyle('tap')}
        aria-pressed={playStyle === 'tap'}
      >
        {tapLabel}
      </button>
      <button
        type="button"
        className={`memory-btn ${playStyle === 'tap_and_hold' ? 'active' : ''}`}
        onClick={() => setPlayStyle('tap_and_hold')}
        aria-pressed={playStyle === 'tap_and_hold'}
      >
        {holdLabel}
      </button>
    </div>
  );
};
