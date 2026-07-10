/**
 * Help content shown from settings: app guide, theory articles, and tour.
 */
import React from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  BookOpen,
  Layers,
  PlayCircle,
} from 'lucide-react';
import { useChordContext } from '../../context/ChordContext';
import type { HelpView } from './helpTypes';
import { BorrowingNeighborsHelp } from './BorrowingNeighborsHelp';
import { CreationTheoryHelp } from './CreationTheoryHelp';
import { ElevatorSystemHelp } from './ElevatorSystemHelp';
import {
  HELP_HUB_BORROWING_BODY,
  HELP_HUB_DIAGRAM_BODY,
  HELP_HUB_LEDE,
  HELP_HUB_THEORY_POINTER,
  HELP_HUB_VOICING_NO_TILT_BODY,
  HELP_HUB_VOICING_TILT_BODY,
} from './helpTheoryContent';

interface HelpPageProps {
  helpView: HelpView;
  onHelpViewChange: (view: HelpView) => void;
  onBackToSettings: () => void;
  onStartTour: (options?: { restart?: boolean }) => void;
  hasCompletedTour: boolean;
}

export const HelpPage: React.FC<HelpPageProps> = ({
  helpView,
  onHelpViewChange,
  onBackToSettings,
  onStartTour,
  hasCompletedTour,
}) => {
  const { tiltModeEnabled } = useChordContext();

  const handleStartTour = () => {
    onStartTour({ restart: hasCompletedTour });
  };

  if (helpView === 'creation-theory') {
    return (
      <CreationTheoryHelp onBack={() => onHelpViewChange('hub')} />
    );
  }

  if (helpView === 'borrowing-neighbors') {
    return (
      <BorrowingNeighborsHelp onBack={() => onHelpViewChange('hub')} />
    );
  }

  if (helpView === 'elevator-system') {
    return (
      <ElevatorSystemHelp onBack={() => onHelpViewChange('hub')} />
    );
  }

  return (
    <div className="help-page">
      <div className="help-page__toolbar">
        <button
          type="button"
          className="help-page__back"
          onClick={onBackToSettings}
          aria-label="Close help"
        >
          <ArrowLeft size={18} />
          <span>Close</span>
        </button>
      </div>

      <div className="help-page__tour-actions">
        <button
          type="button"
          className="help-page__tour-btn"
          onClick={handleStartTour}
        >
          <PlayCircle size={20} aria-hidden="true" />
          {hasCompletedTour ? 'Take the tour again' : 'Start interactive tour'}
        </button>
      </div>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Harmonic Theory</h4>
        <div className="help-page__theory-entries">
          <button
            type="button"
            className="help-page__theory-entry"
            onClick={() => onHelpViewChange('creation-theory')}
          >
            <BookOpen size={22} aria-hidden="true" />
            <span className="help-page__theory-entry-text">
              <span className="help-page__theory-entry-title">
                Creation Theory
              </span>
              <span className="help-page__theory-entry-subtitle">
                Barry Harris's harmonic teachings
              </span>
            </span>
          </button>
          <button
            type="button"
            className="help-page__theory-entry"
            onClick={() => onHelpViewChange('borrowing-neighbors')}
          >
            <ArrowUpDown size={22} aria-hidden="true" />
            <span className="help-page__theory-entry-text">
              <span className="help-page__theory-entry-title">
                Borrowing from the Neighbors
              </span>
              <span className="help-page__theory-entry-subtitle">
                On/off "scale of chords" and borrowing
              </span>
            </span>
          </button>
          <button
            type="button"
            className="help-page__theory-entry"
            onClick={() => onHelpViewChange('elevator-system')}
          >
            <Layers size={22} aria-hidden="true" />
            <span className="help-page__theory-entry-text">
              <span className="help-page__theory-entry-title">
                Elevator System
              </span>
              <span className="help-page__theory-entry-subtitle">
                Nine voicing floors for relative motion
              </span>
            </span>
          </button>
        </div>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">How Movemental Works</h4>
        <p>{HELP_HUB_LEDE}</p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Elemental Diagram</h4>
        <p>{HELP_HUB_DIAGRAM_BODY}</p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Voice Borrowing</h4>
        <p>{HELP_HUB_BORROWING_BODY}</p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">VOICING and IN THE BASS</h4>
        <p>
          {tiltModeEnabled
            ? HELP_HUB_VOICING_TILT_BODY
            : HELP_HUB_VOICING_NO_TILT_BODY}
        </p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Learn More</h4>
        <p>{HELP_HUB_THEORY_POINTER}</p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Tilt vs No Tilt</h4>
        <p>
          Tilt mode (phone) uses motion sensors for voicing and bass note selection. No Tilt
          mode uses manual dropdowns and locks. Desktop Start always enters No
          Tilt with smoothest voice leading.
        </p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Play Style and Voice Leading</h4>
        <p>
          Drone holds notes until you tap again or hit panic. Click &amp; Hold
          releases when you let go. Voice leading modes (Root Position, Smooth,
          Smoothest) control how parallel position moves between chords. Home
          Octave sets register; Tonal Center rotates the clock and pitch labels.
        </p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Recording and Panic</h4>
        <p>
          Session recording captures audio (WebM, exportable as M4A) and MIDI.
          Stop triggers the panic switch with a 300 ms fade out. The panic
          button instantly silences all notes anytime.
        </p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Phone vs Desktop</h4>
        <p>
          On phone, the diagram fills the screen with borrowing sliders below
          and toolbar buttons on the sides. On desktop, the clock face and
          borrowing panel sit beside the diagram with corner action buttons.
        </p>
      </section>
    </div>
  );
};
