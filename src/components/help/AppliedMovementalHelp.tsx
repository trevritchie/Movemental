/**
 * Applied to Movemental help article.
 * Explains how Barry Harris's Creation Theory and Thomas Echols's Elevator System
 * are performed using Movemental's diagram, sliders, and voicing controls.
 */
import React from 'react';
import { HelpArticleLayout } from './HelpArticleLayout';
import { HelpAccordion } from './HelpAccordion';
import { HelpCallout } from './HelpCallout';
import {
  APPLIED_MOVEMENTAL_ATTRIBUTION,
  APPLIED_TOPIC_1_TITLE,
  APPLIED_TOPIC_2_TITLE,
  APPLIED_TOPIC_3_TITLE,
  APPLIED_TOPIC_4_TITLE,
} from './helpTheoryContent';

interface AppliedMovementalHelpProps {
  onBack: () => void;
}

export const AppliedMovementalHelp: React.FC<AppliedMovementalHelpProps> = ({
  onBack,
}) => (
  <HelpArticleLayout
    onBack={onBack}
    attribution={APPLIED_MOVEMENTAL_ATTRIBUTION}
  >
    <section className="help-page__section">
      <p className="help-article__lede">
        Movemental translates Barry Harris&apos;s <strong>Scales of Chords</strong> and Thomas Echols&apos;s{' '}
        <strong>Elevator System</strong> into a direct, physical instrument.
      </p>
      <p className="help-article__lede">
        Here is how each harmonic framework comes alive under your fingers and device motions:
      </p>
    </section>

    <HelpAccordion title={APPLIED_TOPIC_1_TITLE}>
      <p>
        <strong>Earth</strong>, <strong>Wind</strong>, and <strong>Fire</strong> anchor the three corners of the
        triangle as fully diminished seventh parents.
      </p>
      <p>
        <strong>Child chord groups</strong> sit along each axis between two parents, inheriting notes from both.
        Each quality is divided into four sibling slices (<strong>Base</strong>, <strong>Brother</strong>,{' '}
        <strong>Twin</strong>, <strong>Sister</strong>).
      </p>
      <p>
        Rotating between sibling slices preserves the chord type while rotating its geometric polygon around the{' '}
        <strong>Clock Face dial</strong>.
      </p>
      <p>
        <strong>How Diagram Nodes Get Their Names</strong>: The poetic names of the child nodes describe the
        exact balance of notes inherited from their two parent vertices:
      </p>
      <ul className="help-article__list">
        <li className="help-article__list-item">
          <strong>3 Parts Parent A + 1 Part Parent B (Minor 6):</strong> Leans heavily toward the first parent. On the
          Earth and Wind axis, <strong>Trunk</strong> contains 3 Earth notes and 1 Wind note (rooted firmly in the earth).
          Similarly, <strong>Smoke</strong> has 3 Wind and 1 Fire, while <strong>Magma</strong> has 3 Fire and 1 Earth.
        </li>
        <li className="help-article__list-item">
          <strong>2 Parts Parent A + 2 Parts Parent B (Major 6 &amp; Dominant 7&#9837;5):</strong> An equal balance of both
          parents. <strong>Branch</strong> contains 2 Earth notes and 2 Wind notes (reaching into the air with equal
          grounding and lift), while <strong>Sand-Storm</strong> shares this 2-and-2 balance across a symmetrical tritone drop.
          Similarly, <strong>Ember</strong> and <strong>Fire-Storm</strong> have 2 Wind and 2 Fire, while <strong>Glass</strong>{' '}
          and <strong>Forest-Fire</strong> have 2 Fire and 2 Earth.
        </li>
        <li className="help-article__list-item">
          <strong>1 Part Parent A + 3 Parts Parent B (Dominant 7):</strong> Leans heavily toward the second parent. <strong>Leaf</strong>{' '}
          contains 1 Earth note and 3 Wind notes (light and airy, dancing in the breeze). Similarly, <strong>Flame</strong> has
          1 Wind and 3 Fire, while <strong>Charcoal</strong> has 1 Fire and 3 Earth.
        </li>
      </ul>
    </HelpAccordion>

    <HelpAccordion title={APPLIED_TOPIC_2_TITLE}>
      <p>
        Barry Harris&apos;s eight-note scale of chords alternates between your child chord (<strong>&quot;on&quot;</strong>)
        and the untouched third diminished chord (<strong>&quot;off&quot;</strong>). On the triangle, that untouched
        diminished chord is the <strong>Neighbor</strong> at the opposite vertex.
      </p>
      <HelpCallout>
        <strong>In Movemental</strong>, four vertical sliders control <strong>Root</strong>, <strong>Third</strong>,{' '}
        <strong>Fifth</strong>, and <strong>Sixth/Seventh</strong>. The center line plays the pure chord tone.
        Drag up or down to borrow the nearest higher or lower pitch class from the Neighbor&apos;s diminished pool,
        infusing bebop tension without breaking your chord. Tap an active slider node again to mute that voice.
      </HelpCallout>
    </HelpAccordion>

    <HelpAccordion title={APPLIED_TOPIC_3_TITLE}>
      <p>
        Thomas Echols&apos;s <strong>nine elevator floors</strong> determine the vertical spread between chord voices.
        Movemental gives you two expressive ways to ride the elevator:
      </p>
      <p>
        <strong>In Tilt mode</strong>, phone roll steps through the nine floors from narrow <strong>Unison</strong> (full tilt)
        to wide <strong>Double Octave</strong> (flat), creating <strong>contrary motion</strong>. Phone pitch moves the entire
        stack to set <strong>IN THE BASS</strong>, creating <strong>parallel motion</strong> across chord inversions.
      </p>
      <p>
        <strong>In No-Tilt mode</strong>, the <strong>VOICING</strong> selector steps through floors while anchoring the bass,
        creating <strong>oblique motion</strong>. <strong>IN THE BASS</strong> selects inversions independently, and lock
        buttons save your preferred voicings per chord.
      </p>
    </HelpAccordion>

    <HelpAccordion title={APPLIED_TOPIC_4_TITLE}>
      <p>
        Moving between adjacent chord circles on the diagram while staying on the same sibling slice (for example,{' '}
        <strong>Base Branch</strong> to <strong>Base Trunk</strong>) moves only one note by a single <strong>half step</strong>.
      </p>
      <p>
        Movemental&apos;s voice leading engine keeps common tones connected and steps minimal as you travel around the triangle.
      </p>
    </HelpAccordion>
  </HelpArticleLayout>
);
