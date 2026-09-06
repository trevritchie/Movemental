/**
 * Help content shown from settings: app guide, theory articles, and tour.
 */
import React from 'react';
import {
  ArrowUpDown,
  BookOpen,
  Layers,
  Music,
  PlayCircle,
} from 'lucide-react';
import { useChordContext } from '../../context/ChordContext';
import type { HelpView } from './helpTypes';
import { AppliedMovementalHelp } from './AppliedMovementalHelp';
import { CreationTheoryHelp } from './CreationTheoryHelp';
import { ElementalScoresHelp } from './ElementalScoresHelp';
import { ElevatorSystemHelp } from './ElevatorSystemHelp';
import { HelpAccordion } from './HelpAccordion';

interface HelpPageProps {
  helpView: HelpView;
  onHelpViewChange: (view: HelpView) => void;
  onStartTour: (options?: { restart?: boolean }) => void;
  hasCompletedTour: boolean;
}

export const HelpPage: React.FC<HelpPageProps> = ({
  helpView,
  onHelpViewChange,
  onStartTour,
  hasCompletedTour,
}) => {
  const { tiltModeEnabled } = useChordContext();

  const handleStartTour = () => {
    onStartTour({ restart: hasCompletedTour });
  };

  if (helpView === 'elemental-scores') {
    return (
      <ElementalScoresHelp onBack={() => onHelpViewChange('hub')} />
    );
  }

  if (helpView === 'creation-theory') {
    return (
      <CreationTheoryHelp onBack={() => onHelpViewChange('hub')} />
    );
  }

  if (helpView === 'elevator-system') {
    return (
      <ElevatorSystemHelp onBack={() => onHelpViewChange('hub')} />
    );
  }

  if (helpView === 'applied-movemental' || helpView === 'borrowing-neighbors') {
    return (
      <AppliedMovementalHelp onBack={() => onHelpViewChange('hub')} />
    );
  }

  return (
    <div className="help-page">
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

      <button
        type="button"
        className="help-page__theory-entry help-page__featured-entry"
        onClick={() => onHelpViewChange('elemental-scores')}
      >
        <Music size={22} aria-hidden="true" />
        <span className="help-page__theory-entry-text">
          <span className="help-page__theory-entry-title">Elemental Scores</span>
          <span className="help-page__theory-entry-subtitle">
            Learn to play common tunes
          </span>
        </span>
      </button>

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
                Barry Harris&apos;s foundational framework
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
                The Elevator System
              </span>
              <span className="help-page__theory-entry-subtitle">
                Thomas Echols&apos;s voicing floors
              </span>
            </span>
          </button>
          <button
            type="button"
            className="help-page__theory-entry"
            onClick={() => onHelpViewChange('applied-movemental')}
          >
            <ArrowUpDown size={22} aria-hidden="true" />
            <span className="help-page__theory-entry-text">
              <span className="help-page__theory-entry-title">
                Applied to Movemental
              </span>
              <span className="help-page__theory-entry-subtitle">
                Performing both systems on the instrument
              </span>
            </span>
          </button>
        </div>
      </section>

      <HelpAccordion title="How to Play">
        <p>
          <strong>Movemental</strong> is a harmonic playground built around an elemental chord diagram:
        </p>
        <ul className="help-page__accordion-list">
          <li>
            <strong>Tap chords</strong> to play them immediately, or drag across slices for smooth voice-led transitions.
          </li>
          <li>
            <strong>Elevator floors</strong> expand and contract chord width from narrow Unison to wide Double Octave.
          </li>
          <li>
            <strong>Voice borrowing</strong> pulls colorful tones from the opposite vertex on the triangle for dynamic tension.
          </li>
        </ul>
      </HelpAccordion>

      <HelpAccordion title="Diagram and Clock Face">
        <p>
          <strong>Earth</strong>, <strong>Wind</strong>, and <strong>Fire</strong> are &quot;parent&quot; vertices at the triangle corners (fully diminished seventh chords).
        </p>
        <p>
          <strong>Child chords</strong> inherit notes from two parents along each axis, divided into four sibling slices (<strong>Base</strong>, <strong>Brother</strong>, <strong>Twin</strong>, <strong>Sister</strong>).
        </p>
        <p>
          <strong>How Diagram Nodes Get Their Names</strong>: Each node name reflects the proportion of notes inherited from its two parents:
        </p>
        <ul className="help-page__accordion-list">
          <li>
            <strong>3-to-1 Ratio (Minor 6)</strong>: Leans heavily toward the first parent. <strong>Trunk</strong> has 3 Earth notes and 1 Wind note (rooted in the earth). Likewise, <strong>Smoke</strong> has 3 Wind / 1 Fire, and <strong>Magma</strong> has 3 Fire / 1 Earth.
          </li>
          <li>
            <strong>2-to-2 Ratio (Major 6 &amp; Dominant 7&#9837;5)</strong>: Equal balance of both parents. <strong>Branch</strong> has 2 Earth notes and 2 Wind notes (grounded yet reaching into the air), while <strong>Sand-Storm</strong> shares this 2-and-2 balance across a symmetrical tritone drop. Likewise, <strong>Ember</strong> and <strong>Fire-Storm</strong> have 2 Wind / 2 Fire, while <strong>Glass</strong> and <strong>Forest-Fire</strong> have 2 Fire / 2 Earth.
          </li>
          <li>
            <strong>1-to-3 Ratio (Dominant 7)</strong>: Leans heavily toward the second parent. <strong>Leaf</strong> has 1 Earth note and 3 Wind notes (light and airy in the wind). Likewise, <strong>Flame</strong> has 1 Wind / 3 Fire, and <strong>Charcoal</strong> has 1 Fire / 3 Earth.
          </li>
        </ul>
        <p>
          <strong>Clock Face Diagram</strong>: Displays all twelve pitch classes around a circular dial with elemental colors (switch between Chromatic and Circle of Fifths in Settings).
        </p>
        <p>
          <strong>Four-Level Chord Naming</strong>:
        </p>
        <ul className="help-page__accordion-list">
          <li><strong>Elemental Name</strong>: family and sibling slice</li>
          <li><strong>Chord Chemistry</strong>: Earth, Wind, and Fire DNA balance</li>
          <li><strong>Traditional Name</strong>: standard jazz/classical symbol</li>
          <li><strong>Note Names</strong>: exact sounding pitches</li>
        </ul>
      </HelpAccordion>

      <HelpAccordion title="Voice Borrowing Sliders">
        <p>
          Four vertical sliders represent the chord voices (<strong>Root</strong>, <strong>Third</strong>, <strong>Fifth</strong>, <strong>Sixth/Seventh</strong>).
        </p>
        <p>
          The center line plays the pure chord tone; drag up or down to <strong>borrow from the neighbor</strong> (the opposite vertex across the triangle) for extra color.
        </p>
        <p>
          Tap an active slider node again to <strong>mute that voice</strong> (creating smaller voicings such as triads or two-note shells).
        </p>
      </HelpAccordion>

      <HelpAccordion title="VOICING, IN THE BASS, and Tilt">
        {tiltModeEnabled ? (
          <>
            <p>
              <strong>VOICING (Tilt Roll)</strong>: Roll your phone left or right to step through nine elevator floors from narrow <strong>Unison</strong> (full tilt) to wide <strong>Double Octave</strong> (flat), enabling <strong>contrary motion</strong>.
            </p>
            <p>
              <strong>IN THE BASS (Tilt Pitch)</strong>: Tilt forward or backward to shift registers and choose which chord tone anchors the bass, enabling <strong>parallel motion</strong>.
            </p>
            <p>
              With <strong>Tilt to Strum</strong> on, the readout shows your live floor and bass note. With it off, the top value is what you will hear if you tap a chord now, while the lower value is what sounded last.
            </p>
          </>
        ) : (
          <>
            <p>
              <strong>VOICING</strong>: Select an elevator floor from the VOICING pill to shape chord width from narrow <strong>Unison</strong> to wide <strong>Double Octave</strong> using <strong>oblique motion</strong> (expanding upward from the bass).
            </p>
            <p>
              <strong>IN THE BASS</strong>: Choose which chord tone anchors the bottom voice independently of your voicing floor.
            </p>
            <p>
              Tap the <strong>lock icons</strong> to save your preferred voicing floor and bass inversion per chord.
            </p>
          </>
        )}
      </HelpAccordion>

      <HelpAccordion title="Play Style, Settings, and Voice Leading">
        <ul className="help-page__accordion-list">
          <li>
            <strong>Play Style</strong>: <strong>Tap</strong> (Click on desktop) holds notes until you tap again or hit panic. <strong>Tap &amp; Hold</strong> releases notes when you let go.
          </li>
          <li>
            <strong>Tilt to Strum</strong>: Dynamically re-voices chords as you move between tilt levels without retapping, with tempo rate limits set by <strong>BPM</strong> and <strong>Shortest Note</strong>.
          </li>
          <li>
            <strong>Retrigger Sounding Notes</strong>: Toggles whether common tones re-attack when changing chords.
          </li>
          <li>
            <strong>Voice Leading</strong>: Choose between <strong>Root Position</strong>, <strong>Smooth</strong>, and <strong>Smoothest</strong> to control how chord degrees transition across moves.
          </li>
          <li>
            <strong>Customization</strong>: Adjust <strong>tonal center</strong>, <strong>home octave</strong>, <strong>Borrowing Memory</strong> (Global vs Per-Chord), <strong>Clock Face layouts</strong> (Chromatic or Circle of Fifths), <strong>Glowing Orbs</strong>, <strong>Harmonic Function Labels</strong>, <strong>Synth Presets</strong>, <strong>ADSR envelopes</strong>, EQ profiles, and <strong>audio FX</strong> (Chorus, Delay, Reverb).
          </li>
        </ul>
      </HelpAccordion>

      <HelpAccordion title="Recording and Panic">
        <ul className="help-page__accordion-list">
          <li>
            <strong>Session Recording</strong>: Captures your performance live in <strong>audio</strong> and <strong>MIDI</strong>.
          </li>
          <li>
            <strong>Stop &amp; Review</strong>: Stopping a take engages a clean 300 ms fade and opens the review dialog to audition your take, download audio, or export MIDI.
          </li>
          <li>
            <strong>Panic Switch</strong>: Instantly silences all sounding audio, cuts synth envelopes, and releases active MIDI notes anytime.
          </li>
        </ul>
      </HelpAccordion>
    </div>
  );
};
