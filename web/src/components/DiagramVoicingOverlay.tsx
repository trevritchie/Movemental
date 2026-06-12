import React from 'react';
import {
  tiltInversionLevelName,
  tiltVoicingLevelName,
  TILT_INVERSION_LEVEL_NAMES,
  TILT_VOICING_LEVEL_NAMES,
} from '../music/TiltVoicingEngine';
import { useChordContext } from '../context/ChordContext';

/**
 * Phone-only overlay: voicing (top left) and inversion (top right), mirroring
 * the clock/chord info anchored to the diagram bottom corners.
 */
export const DiagramVoicingOverlay: React.FC = () => {
  const {
    playStyle,
    staticVoicingLevel,
    setStaticVoicingLevel,
    staticInversionLevel,
    setStaticInversionLevel,
    tiltStatus,
    tiltSample,
    requestTiltPermission,
  } = useChordContext();

  const isTilt = playStyle === 'tilt';

  const renderVoicingCorner = () => {
    if (!isTilt) {
      return (
        <select
          className="diagram-overlay-select"
          value={staticVoicingLevel}
          onChange={(e) => setStaticVoicingLevel(Number(e.target.value))}
          title="Voicing level"
          aria-label="Voicing level"
        >
          {TILT_VOICING_LEVEL_NAMES.map((name, idx) => (
            <option key={name} value={idx}>{name}</option>
          ))}
        </select>
      );
    }

    if (tiltStatus === 'needs-permission') {
      return (
        <button
          type="button"
          className="diagram-overlay-btn"
          onClick={() => requestTiltPermission()}
          title="Allow access to the motion sensors"
        >
          Enable Motion
        </button>
      );
    }

    if (tiltStatus === 'denied') {
      return (
        <button
          type="button"
          className="diagram-overlay-btn"
          onClick={() => requestTiltPermission()}
          title="Motion access was denied. Tap to retry."
        >
          Motion Denied
        </button>
      );
    }

    if (tiltStatus === 'unsupported') {
      return (
        <span className="diagram-overlay-label" title="No motion sensors">
          No motion
        </span>
      );
    }

    return (
      <span
        className="diagram-overlay-label"
        title="Roll sets voicing width"
      >
        {tiltVoicingLevelName(tiltSample)}
      </span>
    );
  };

  const renderInversionCorner = () => {
    if (!isTilt) {
      return (
        <select
          className="diagram-overlay-select diagram-overlay-select--right"
          value={staticInversionLevel}
          onChange={(e) => setStaticInversionLevel(Number(e.target.value))}
          title="Inversion level"
          aria-label="Inversion level"
        >
          {TILT_INVERSION_LEVEL_NAMES.map((name, idx) => (
            <option key={name} value={idx}>{name}</option>
          ))}
        </select>
      );
    }

    return (
      <span
        className="diagram-overlay-label diagram-overlay-label--right"
        title="Pitch selects inversion"
      >
        {tiltInversionLevelName(tiltSample)}
      </span>
    );
  };

  return (
    <div className="diagram-voicing-overlay" aria-live="polite">
      <div className="diagram-voicing-overlay__corner diagram-voicing-overlay__corner--left">
        {renderVoicingCorner()}
      </div>
      <div className="diagram-voicing-overlay__corner diagram-voicing-overlay__corner--right">
        {renderInversionCorner()}
      </div>
    </div>
  );
};
