/**
 * Barry Harris's "Creation Theory" help article.
 */
import React from 'react';
import { HelpArticleLayout } from './HelpArticleLayout';
import { HelpAccordion } from './HelpAccordion';
import { HelpCallout } from './HelpCallout';
import {
  CREATION_STEP_1_TITLE,
  CREATION_STEP_2_TITLE,
  CREATION_STEP_3_TITLE,
  CREATION_STEP_4_RULES,
  CREATION_STEP_4_TITLE,
  CREATION_STEP_5_TITLE,
  CREATION_THEORY_ATTRIBUTION,
  CREATION_THEORY_VIDEO_TITLE_1,
  CREATION_THEORY_VIDEO_TITLE_2,
  CREATION_THEORY_VIDEO_URL,
  CREATION_THEORY_VIDEO_URL_2,
} from './helpTheoryContent';

interface CreationTheoryHelpProps {
  onBack: () => void;
}

export const CreationTheoryHelp: React.FC<CreationTheoryHelpProps> = ({
  onBack,
}) => (
  <HelpArticleLayout
    onBack={onBack}
    attribution={CREATION_THEORY_ATTRIBUTION}
    videoLinks={[
      {
        url: CREATION_THEORY_VIDEO_URL,
        title: CREATION_THEORY_VIDEO_TITLE_1,
      },
      {
        url: CREATION_THEORY_VIDEO_URL_2,
        title: CREATION_THEORY_VIDEO_TITLE_2,
      },
    ]}
  >
    <section className="help-page__section">
      <p className="help-article__lede">
        Barry Harris&apos;s <strong>Creation Theory</strong> reveals how the entire harmonic universe
        unfolds from unity into rich chord families. Barry Harris was a Christian, so he compared
        this theory to <strong>The Book of Genesis</strong> in The Bible. We paraphrase his poetic
        teaching metaphors below to honor his life&apos;s work and show how Movemental&apos;s own
        analogies derive from them.
      </p>
    </section>

    <HelpAccordion title={CREATION_STEP_1_TITLE}>
      <p>
        In the beginning, the Creator made the universe: the <strong>twelve pitch classes</strong> of
        the <strong>chromatic scale</strong>.
      </p>
      <p>
        This total chromatic collection is the complete world of sound from which every musical
        note, chord, and progression is drawn.
      </p>
      <HelpCallout>
        <strong>In Movemental</strong>, the <strong>Clock Face dial</strong> visualizes these twelve
        chromatic pitch classes around a circular geometry, color-coded by their elemental origins.
      </HelpCallout>
    </HelpAccordion>

    <HelpAccordion title={CREATION_STEP_2_TITLE}>
      <p>
        Just as God created Man and Woman (<strong>Adam and Eve</strong>), the twelve-note universe
        naturally divides into two symmetrical <strong>whole-tone scales</strong> of six notes each:
      </p>
      <ul className="help-article__list">
        <li className="help-article__list-item">
          <strong>Whole Tone 1:</strong> C, D, E, F#, G#, A#
        </li>
        <li className="help-article__list-item">
          <strong>Whole Tone 2:</strong> D&#9837;, E&#9837;, F, G, A, B
        </li>
      </ul>
      <p>
        Because their steps are completely uniform, neither scale has a single home center; they
        are the <strong>primordial ancestors</strong> of all harmony.
      </p>
      <HelpCallout>
        <strong>In Movemental</strong>, think of these two whole-tone scales as underlying the
        geometric symmetry of Movemental. While they aren&apos;t represented on the diagram, they
        give rise to <strong>Earth, Wind, and Fire</strong>.
      </HelpCallout>
    </HelpAccordion>

    <HelpAccordion title={CREATION_STEP_3_TITLE}>
      <p>
        After the fall of Eden, Adam and Eve united to create offspring. By combining three notes from
        Adam with one note from Eve (or three from Eve and one from Adam), the parents gave birth to the{' '}
        <strong>three fully diminished seventh chords</strong> (four notes each, spaced by minor thirds).
      </p>
      <p>
        These three chords are the first true harmonic generation.
      </p>
      <HelpCallout>
        <strong>In Movemental</strong>, these three diminished chords are{' '}
        <strong>Earth, Wind, and Fire</strong>, the three corner vertices of the triangle diagram.
      </HelpCallout>
    </HelpAccordion>

    <HelpAccordion title={CREATION_STEP_4_TITLE}>
      <p>
        From these three primordial diminished parents, generations of children were born by combining
        notes from two parent pools. By systematically lowering notes by a <strong>half step</strong> (testing
        all permutations), you discover exactly <strong>four fundamental chord qualities</strong>:
      </p>
      <ul className="help-article__list">
        {CREATION_STEP_4_RULES.map((rule) => (
          <li key={rule.label} className="help-article__list-item">
            <strong>{rule.label}:</strong> {rule.result}
          </li>
        ))}
      </ul>
      <p>
        <strong>Music Theory Note:</strong> While Barry Harris designated Major 6th and Dominant 7th as
        distinct 3+1 types based on voicing and tonic resolution, in standard pitch-class set theory, a{' '}
        <strong>Dominant 7th</strong> (e.g. C7: C-E-G-B&#9837;) and <strong>Major 6th</strong> (e.g.
        E&#9837;6: E&#9837;-G-B&#9837;-C) share the exact same pitch collection (inversionally equivalent).
        Barry loved this duality, showing how a single shape functions as both a tonic and a dominant.
      </p>
      <p>
        For each pair of parents, each chord quality is born <strong>four times</strong> (or twice for Dom
        7&#9837;5). Barry called these <strong>sibling chords</strong>; in Movemental, we call them{' '}
        <strong>Base, Brother, Twin, and Sister</strong>.
      </p>
      <HelpCallout>
        <strong>In Movemental</strong>, each child group along a triangle axis (such as <strong>Trunk</strong>,{' '}
        <strong>Branch</strong>, or <strong>Leaf</strong>) reflects the ratio of notes inherited from its parents:{' '}
        <strong>Trunk</strong> contains 3 Earth notes and 1 Wind note, <strong>Branch</strong> contains 2 Earth and 2 Wind,{' '}
        and <strong>Leaf</strong> contains 1 Earth and 3 Wind. Each group splits into four <strong>sibling slices</strong> that{' '}
        rotate symmetrically around the clock face.
      </HelpCallout>
    </HelpAccordion>

    <HelpAccordion title={CREATION_STEP_5_TITLE}>
      <p>
        Every four-note chord combines DNA from two parent diminished chords, which leaves the third diminished
        chord completely untouched.
      </p>
      <p>
        To build a complete scale for movement and improvisation, Barry Harris combined the four-note chord with the
        unused diminished chord (4 chord notes + 4 diminished notes = <strong>8-note &quot;scale of chords&quot;</strong>).
        This allows you to alternate between <strong>tension and resolution</strong> (<strong>on</strong> and{' '}
        <strong>off</strong> chords) and mix them together.
      </p>
      <p>
        By <strong>borrowing</strong> notes from the untouched neighbor diminished chord, all the other types of chords
        in jazz harmony arise (for example, borrowing one note on a Major 6th yields a Major 7th, two notes yields a
        Major 7th #5, and so on).
      </p>
      <HelpCallout>
        <strong>In Movemental</strong>, that untouched third diminished chord is the Neighbor (the opposite vertex
        across the triangle). Alternating between your child chord (<strong>&quot;on&quot;</strong>) and its neighbor
        diminished chord (<strong>&quot;off&quot;</strong>) creates beautiful, flowing movements.
      </HelpCallout>
    </HelpAccordion>
  </HelpArticleLayout>
);


