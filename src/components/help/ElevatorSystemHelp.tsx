/**
 * Thomas Echols Elevator System help article.
 */
import React from 'react';
import { HelpArticleLayout } from './HelpArticleLayout';
import { HelpAccordion } from './HelpAccordion';
import {
  ELEVATOR_CONTRARY_ON_OFF_BODY,
  ELEVATOR_CONTRARY_BIGGER_INTERVALS_BODY,
  ELEVATOR_FLOORS,
  ELEVATOR_MOTION_TOPICS,
  ELEVATOR_SYSTEM_ATTRIBUTION,
  ELEVATOR_SYSTEM_VIDEO_TITLE,
  ELEVATOR_SYSTEM_VIDEO_URL,
  LABYRINTH_CHANNEL_URL,
} from './helpTheoryContent';

interface ElevatorSystemHelpProps {
  onBack: () => void;
}

export const ElevatorSystemHelp: React.FC<ElevatorSystemHelpProps> = ({
  onBack,
}) => (
  <HelpArticleLayout
    onBack={onBack}
    attribution={
      <>
        {ELEVATOR_SYSTEM_ATTRIBUTION}{' '}
        <a
          className="help-article__inline-link"
          href={LABYRINTH_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Labyrinth of Limitations
        </a>
        .
      </>
    }
    videoUrl={ELEVATOR_SYSTEM_VIDEO_URL}
    videoTitle={ELEVATOR_SYSTEM_VIDEO_TITLE}
  >
    <section className="help-page__section">
      <p className="help-article__lede">
        The <strong>Elevator Sequence</strong> is a series of nine voicings that we use for all kinds of{' '}
        <strong>polyphonic motion</strong>: when you have more than one melody happening at the same time,
        and how they relate to each other.
      </p>
      <p className="help-article__lede">
        Rather than being purely drop-2 centric, starting from <strong>small floors first</strong> brings
        our attention to subtle contrary motions and inner voice movements.
      </p>
    </section>

    <HelpAccordion title="The Nine Floors">
      <ol className="help-article__list help-article__list--ordered">
        {ELEVATOR_FLOORS.map((item) => (
          <li key={item.floor} className="help-article__list-item">
            <strong>
              Floor {item.floor}: {item.name}.
            </strong>{' '}
            {item.description}
          </li>
        ))}
      </ol>
    </HelpAccordion>

    <HelpAccordion title="Relative Motion">
      <p>
        The Elevator is especially useful for <strong>polyphonic lines</strong>: several melodies
        moving at once. Three classical motion types map cleanly onto the floors:
      </p>
      {ELEVATOR_MOTION_TOPICS.map((topic) => (
        <div key={topic.title} className="help-article__subsection">
          <h4 className="help-article__subsection-title">{topic.title}</h4>
          <p>
            <strong>Mechanic:</strong> {topic.mechanic}
          </p>
          <p>
            <strong>Application:</strong> {topic.application}
          </p>
          {topic.title === 'Contrary motion' && (
            <>
              <p>
                <strong>Scale of chords:</strong> {ELEVATOR_CONTRARY_ON_OFF_BODY}
              </p>
              <p>{ELEVATOR_CONTRARY_BIGGER_INTERVALS_BODY}</p>
            </>
          )}
        </div>
      ))}
    </HelpAccordion>

    <HelpAccordion title="Codifying Movement: Formulas of Movement">
      <p>
        One of the most powerful things to do with the elevator is to{' '}
        <strong>codify movement into repeatable formulas</strong>.
      </p>
      <p>
        Instead of improvising purely by chance, you can establish an{' '}
        <strong>off-to-on sequence</strong> (such as an octave chord stepping out to a drop 2,
        or a triad stepping out to a shell) and transpose that exact formula across scale
        degrees or start it from different floors.
      </p>
    </HelpAccordion>

    <HelpAccordion title="Subset and Superset">
      <p>
        Knowing your <strong>elevator of intervals</strong> lets you spot smaller subsets within
        a larger chord frame (<strong>superset</strong>).
      </p>
      <p>
        A <strong>Drop 2 chord</strong> contains thirds, fifths, and tenths inside its structure.
        By recognizing those intervals, you can create movement within inner voices while the
        overall chord shape remains anchored.
      </p>
    </HelpAccordion>

    <HelpAccordion title="Practice Over Theory (&quot;Roll Up Your Sleeves&quot;)">
      <p>
        Thomas emphasizes that Barry Harris&apos;s concepts are meant to be practiced, not merely comprehended:
      </p>
      <p>
        <em>
          &quot;This is not an armchair philosopher kind of thing; we have to get in there, roll up our sleeves,
          and practice if we want to understand anything. Can we do it? That is the only way we can say we really know anything.&quot;
        </em>
      </p>
    </HelpAccordion>

    <HelpAccordion title="Voicing and the Bass Note">
      <p>
        In <strong>No-Tilt mode</strong>, changing the voicing on the elevator keeps the bass note the same{' '}
        (<strong>pivot anchor</strong>). Inner and outer voices reshape around that fixed bass, which is
        effectively <strong>oblique motion</strong>: one line stays put while others move.
      </p>
      <p>
        In <strong>Tilt mode</strong>, roll steps through voicing floors with the <strong>contrary anchor</strong> instead:
        the bass shifts automatically as the spread changes, so widening or narrowing the voicing produces opening or
        closing <strong>contrary motion</strong>.
      </p>
    </HelpAccordion>
  </HelpArticleLayout>
);
