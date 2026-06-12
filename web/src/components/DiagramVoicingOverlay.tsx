import React from 'react';
import {
  tiltInversionLevelName,
  tiltVoicingOverlayLabel,
  TILT_INVERSION_LEVEL_NAMES,
  TILT_VOICING_OVERLAY_LABELS,
  TILT_VOICING_OVERLAY_MAX_LABEL,
  TILT_VOICING_LEVEL_NAMES,
} from '../music/TiltVoicingEngine';
import { useChordContext } from '../context/ChordContext';
import { DiagramOverlayPill } from './DiagramOverlayPill';

/** Shared sizer so voicing and inversion pills stay the same width. */
const TOP_PILL_SIZER = TILT_VOICING_OVERLAY_MAX_LABEL;

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

  const renderVoicingValue = () => {
    if (!isTilt) {
      return (
        <select
          className="diagram-overlay-select"
          value={staticVoicingLevel}
          onChange={(e) => setStaticVoicingLevel(Number(e.target.value))}
          title="Voicing"
          aria-label="Voicing"
        >
          {TILT_VOICING_OVERLAY_LABELS.map((name, idx) => (
            <option key={TILT_VOICING_LEVEL_NAMES[idx]} value={idx}>
              {name}
            </option>
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
        <span className="diagram-overlay-readout" title="No motion sensors">
          No motion
        </span>
      );
    }

    return (
      <span
        className="diagram-overlay-readout"
        title="Roll sets voicing width"
      >
        {tiltVoicingOverlayLabel(tiltSample)}
      </span>
    );
  };

  const renderInversionValue = () => {
    if (!isTilt) {
      return (
        <select
          className="diagram-overlay-select"
          value={staticInversionLevel}
          onChange={(e) => setStaticInversionLevel(Number(e.target.value))}
          title="Inversion"
          aria-label="Inversion"
        >
          {TILT_INVERSION_LEVEL_NAMES.map((name, idx) => (
            <option key={name} value={idx}>{name}</option>
          ))}
        </select>
      );
    }

    return (
      <span
        className="diagram-overlay-readout"
        title="Pitch selects inversion"
      >
        {tiltInversionLevelName(tiltSample)}
      </span>
    );
  };

  return (
    <div className="diagram-voicing-overlay" aria-live="polite">
      <DiagramOverlayPill
        label="Voicing"
        corner="top-left"
        sizerText={TOP_PILL_SIZER}
      >
        {renderVoicingValue()}
      </DiagramOverlayPill>
      <DiagramOverlayPill
        label="Inversion"
        corner="top-right"
        sizerText={TOP_PILL_SIZER}
      >
        {renderInversionValue()}
      </DiagramOverlayPill>
    </div>
  );
};
