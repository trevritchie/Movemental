import React from 'react';
import {
  tiltVoicingOverlayLabel,
  TILT_VOICING_OVERLAY_LABELS,
  TILT_VOICING_OVERLAY_MAX_LABEL,
  TILT_VOICING_LEVEL_NAMES,
} from '../music/TiltVoicingEngine';
import {
  bassDegreeLabelsForSelect,
  tiltBassPositionLabel,
  TILT_BASS_DEGREE_MOBILE_MAX_LABEL,
} from '../music/voiceDegreeLabel';
import { useChordContext } from '../context/ChordContext';
import { DiagramOverlayPill } from './DiagramOverlayPill';

/** Shared sizer so voicing and bass pills stay the same width. */
const TOP_PILL_SIZER = TILT_VOICING_OVERLAY_MAX_LABEL;

interface SoundingReadoutProps {
  value: string;
}

/** Gray sub-label for the voicing committed at the last diagram tap. */
const SoundingReadout: React.FC<SoundingReadoutProps> = ({ value }) => (
  <span className="diagram-overlay-sounding">{value}</span>
);

interface TiltReadoutStackProps {
  showSounding: boolean;
  soundingLabel: string | null;
  children: React.ReactNode;
}

const TiltReadoutStack: React.FC<TiltReadoutStackProps> = ({
  showSounding,
  soundingLabel,
  children,
}) => (
  <div className="diagram-overlay-readout-stack">
    {children}
    {showSounding && soundingLabel && (
      <SoundingReadout value={soundingLabel} />
    )}
  </div>
);

/**
 * Diagram overlay: voicing (top left) and bass degree (top right).
 */
export const DiagramVoicingOverlay: React.FC = () => {
  const bassMaxLabel = TILT_BASS_DEGREE_MOBILE_MAX_LABEL;

  const {
    playStyle,
    staticVoicingLevel,
    setStaticVoicingLevel,
    staticPositionLevel,
    setStaticPositionLevel,
    selectedChord,
    tonalCenter,
    octaveRange,
    borrowingState,
    previousPlayedChord,
    voiceLeadingMode,
    lastTapTilt,
    smoothBaseParallel,
    lastPlayedVoicingLabel,
    lastPlayedBassLabel,
    tiltStatus,
    tiltSample,
    requestTiltPermission,
  } = useChordContext();

  const isTilt = playStyle === 'tilt';
  const bassSelectLabels = React.useMemo(
    () => bassDegreeLabelsForSelect(selectedChord),
    [selectedChord]
  );
  const tiltBassContext = React.useMemo(
    () => ({
      tonalCenter,
      octaveRange,
      borrowingState,
      previousChord: previousPlayedChord,
      voiceLeadingMode,
      smoothBaseParallel,
      lastTapTilt,
      playStyle,
    }),
    [
      tonalCenter,
      octaveRange,
      borrowingState,
      previousPlayedChord,
      voiceLeadingMode,
      smoothBaseParallel,
      lastTapTilt,
      playStyle,
    ]
  );

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
      <TiltReadoutStack
        showSounding={isTilt}
        soundingLabel={lastPlayedVoicingLabel}
      >
        <span
          className="diagram-overlay-readout"
          title="Roll sets voicing width"
        >
          {tiltVoicingOverlayLabel(tiltSample)}
        </span>
      </TiltReadoutStack>
    );
  };

  const renderBassValue = () => {
    if (!isTilt) {
      return (
        <select
          className="diagram-overlay-select"
          value={staticPositionLevel}
          onChange={(e) => setStaticPositionLevel(Number(e.target.value))}
          title="In the bass"
          aria-label="In the bass"
        >
          {bassSelectLabels.map((name, idx) => (
            <option key={name} value={idx}>
              {name}
            </option>
          ))}
        </select>
      );
    }

    return (
      <TiltReadoutStack
        showSounding={isTilt}
        soundingLabel={lastPlayedBassLabel}
      >
        <span
          className="diagram-overlay-readout"
          title="Pitch tilt sets which chord tone is in the bass"
        >
          {tiltBassPositionLabel(tiltSample, selectedChord, tiltBassContext)}
        </span>
      </TiltReadoutStack>
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
        label="IN THE BASS"
        corner="top-right"
        sizerText={bassMaxLabel}
      >
        {renderBassValue()}
      </DiagramOverlayPill>
    </div>
  );
};
