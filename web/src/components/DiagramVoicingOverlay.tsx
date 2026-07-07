import React from 'react';
import {
  tiltVoicingOverlayLabel,
  TILT_VOICING_OVERLAY_LABELS,
  TILT_VOICING_OVERLAY_MAX_LABEL,
  TILT_VOICING_LEVEL_NAMES,
} from '../music/TiltVoicingEngine';
import {
  bassDegreeLabelsForSelect,
  tiltBassDegreeLabel,
  TILT_BASS_DEGREE_MOBILE_MAX_LABEL,
} from '../music/voiceDegreeLabel';
import { useChordContext } from '../context/ChordContext';
import { useTiltReadoutContext } from '../context/TiltReadoutContext';
import { DiagramOverlayPill } from './DiagramOverlayPill';
import { NoTiltLockButton } from './NoTiltLockButton';

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
  const {
    tiltModeEnabled,
    noTiltVoicingLevel,
    setNoTiltVoicingLevel,
    noTiltPositionLevel,
    setNoTiltPositionLevel,
    selectedChord,
    isNoTiltVoicingLocked,
    isNoTiltBassLocked,
    toggleNoTiltVoicingLock,
    toggleNoTiltBassLock,
    tonalCenter,
    octaveRange,
    borrowingState,
    previousPlayedChord,
    voiceLeadingMode,
    lastTapTilt,
    lastCommittedPlaybackTilt,
    smoothBaseParallel,
    lastPlayedVoicingLabel,
    lastPlayedBassLabel,
    lastElementalPlayback,
  } = useChordContext();

  const { tiltStatus, tiltSample, requestTiltPermission } =
    useTiltReadoutContext();

  const isTilt = tiltModeEnabled;
  const chordName = selectedChord?.name;
  const voicingLockLabel = chordName
    ? `${isNoTiltVoicingLocked ? 'Unlock' : 'Lock'} voicing for ${chordName}`
    : 'Lock voicing';
  const bassLockLabel = chordName
    ? `${isNoTiltBassLocked ? 'Unlock' : 'Lock'} bass for ${chordName}`
    : 'Lock bass';
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
      tiltModeEnabled,
      ...(lastElementalPlayback ? { elemental: lastElementalPlayback } : {}),
      ...(voiceLeadingMode === 'smooth' || voiceLeadingMode === 'smoothest'
        ? { lastTapTilt, lastCommittedPlaybackTilt }
        : {}),
      ...(voiceLeadingMode === 'smoothest'
        ? { smoothBaseParallel }
        : {}),
    }),
    [
      tonalCenter,
      octaveRange,
      borrowingState,
      previousPlayedChord,
      voiceLeadingMode,
      tiltModeEnabled,
      lastElementalPlayback,
      smoothBaseParallel,
      lastTapTilt,
      lastCommittedPlaybackTilt,
    ]
  );

  const tiltBassLabel = React.useMemo(
    () => tiltBassDegreeLabel(tiltSample, selectedChord, tiltBassContext),
    [tiltSample, selectedChord, tiltBassContext]
  );

  const renderVoicingValue = () => {
    if (!isTilt) {
      return (
        <div className="diagram-overlay-control">
          <select
            className="diagram-overlay-select"
            value={noTiltVoicingLevel}
            onChange={(e) => setNoTiltVoicingLevel(Number(e.target.value))}
            title="Voicing"
            aria-label="Voicing"
          >
            {TILT_VOICING_OVERLAY_LABELS.map((name, idx) => (
              <option key={TILT_VOICING_LEVEL_NAMES[idx]} value={idx}>
                {name}
              </option>
            ))}
          </select>
          <NoTiltLockButton
            locked={isNoTiltVoicingLocked}
            disabled={!chordName}
            label={voicingLockLabel}
            onToggle={toggleNoTiltVoicingLock}
          />
        </div>
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
        <div className="diagram-overlay-control">
          <select
            className="diagram-overlay-select"
            value={noTiltPositionLevel}
            onChange={(e) => setNoTiltPositionLevel(Number(e.target.value))}
            title="In the bass"
            aria-label="In the bass"
          >
            {bassSelectLabels.map((name, idx) => (
              <option key={name} value={idx}>
                {name}
              </option>
            ))}
          </select>
          <NoTiltLockButton
            locked={isNoTiltBassLocked}
            disabled={!chordName}
            label={bassLockLabel}
            onToggle={toggleNoTiltBassLock}
          />
        </div>
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
          {tiltBassLabel}
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
        dataTourId="tour-voicing"
        className={
          !isTilt && isNoTiltVoicingLocked
            ? 'diagram-overlay-pill--locked'
            : undefined
        }
      >
        {renderVoicingValue()}
      </DiagramOverlayPill>
      <DiagramOverlayPill
        label="IN THE BASS"
        corner="top-right"
        sizerText={TILT_BASS_DEGREE_MOBILE_MAX_LABEL}
        dataTourId="tour-bass"
        className={
          !isTilt && isNoTiltBassLocked
            ? 'diagram-overlay-pill--locked'
            : undefined
        }
      >
        {renderBassValue()}
      </DiagramOverlayPill>
    </div>
  );
};
