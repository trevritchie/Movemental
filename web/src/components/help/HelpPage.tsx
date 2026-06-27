/**
 * Help content shown from settings: app guide and tour entry points.
 */
import React from 'react';
import { ArrowLeft, Compass, PlayCircle } from 'lucide-react';
import { useChordContext } from '../../context/ChordContext';

interface HelpPageProps {
  onBack: () => void;
  onStartTour: (options?: { restart?: boolean }) => void;
  hasCompletedTour: boolean;
}

export const HelpPage: React.FC<HelpPageProps> = ({
  onBack,
  onStartTour,
  hasCompletedTour,
}) => {
  const { tiltModeEnabled } = useChordContext();

  const handleStartTour = () => {
    onStartTour({ restart: hasCompletedTour });
  };

  return (
    <div className="help-page">
      <div className="help-page__toolbar">
        <button
          type="button"
          className="help-page__back"
          onClick={onBack}
          aria-label="Back to settings"
        >
          <ArrowLeft size={18} />
          <span>Settings</span>
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

      <div className="help-page__intro">
        <Compass size={28} aria-hidden="true" />
        <h3 className="help-page__heading">How Movemental works</h3>
        <p className="help-page__lede">
          Movemental is a harmonic playground built around an elemental chord
          diagram. Tap chords to hear them, shape voicing and bass, and borrow
          tones from the opposite element.
        </p>
      </div>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Elemental diagram</h4>
        <p>
          Earth, Wind, and Fire sit at the triangle corners. Chord groups fan
          out from each pair. Tap any slice or parent element to play that
          chord.
        </p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Voice borrowing</h4>
        <p>
          Four vertical sliders control Root, Third, Fifth, and Sixth/Seventh.
          Drag up or down to borrow from the opposite element. Tap the active
          slider node again to mute that voice.
        </p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Voicing and IN THE BASS</h4>
        {tiltModeEnabled ? (
          <p>
            In Tilt mode, roll (left/right tilt) sets voicing width and pitch
            (forward/back tilt) sets IN THE BASS. Labels update live before
            each tap.
          </p>
        ) : (
          <p>
            In No Tilt mode, use the Voicing and IN THE BASS dropdowns on the
            diagram. Lock buttons keep your choices per chord when you leave
            and return.
          </p>
        )}
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Tilt vs No Tilt</h4>
        <p>
          Tilt mode (phone) uses motion sensors for voicing and bass. No Tilt
          mode uses manual dropdowns and locks. Desktop Start always enters No
          Tilt with smoothest voice leading.
        </p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Play style and voice leading</h4>
        <p>
          Drone holds notes until you tap again or hit panic. Click &amp; Hold
          releases when you let go. Voice leading modes (Root Position, Smooth,
          Smoothest) control how parallel position moves between chords. Home
          Octave sets register; Tonal Center rotates the clock and pitch labels.
        </p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Recording and panic</h4>
        <p>
          Session recording captures audio (WebM, exportable as M4A) and MIDI.
          Stop triggers the panic switch with a 300 ms fade out. The panic
          button instantly silences all notes anytime.
        </p>
      </section>

      <section className="help-page__section">
        <h4 className="help-page__section-title">Phone vs desktop</h4>
        <p>
          On phone, the diagram fills the screen with borrowing sliders below
          and toolbar buttons on the sides. On desktop, the clock face and
          borrowing panel sit beside the diagram with corner action buttons.
        </p>
      </section>
    </div>
  );
};
