/**
 * Thomas Echols Elevator System help article.
 */
import React from 'react';
import { HelpArticleLayout } from './HelpArticleLayout';
import { HelpCallout } from './HelpCallout';
import {
  ELEVATOR_CONTRARY_ON_OFF_BODY,
  ELEVATOR_CONTRARY_BIGGER_INTERVALS_BODY,
  ELEVATOR_FLOORS,
  ELEVATOR_MOTION_TOPICS,
  ELEVATOR_SYSTEM_ATTRIBUTION,
  ELEVATOR_SYSTEM_VIDEO_URL,
  ELEVATOR_VOICING_BASS_NOTE,
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
  >
    <section className="help-page__section">
      <p className="help-article__lede">
        The Elevator Sequence comes from Barry Harris&apos;s Scales of Chords.
        Nine floors of harmonic density run from the narrowest spread (unison)
        to the widest (double octaves). Each floor is a toolkit for shaping
        voicing width and relative motion on any polyphonic instrument.
      </p>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">The nine floors</h3>
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
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">Relative motion</h3>
      <p>
        The Elevator is especially useful for polyphonic lines: several
        melodies moving at once. Three classical motion types map cleanly onto
        the floors.
      </p>
      <HelpCallout label="In Movemental: tilt and no-tilt">
        In Tilt mode, phone <strong>roll</strong> steps through the nine
        voicing floors (the Voicing readout). Phone <strong>pitch</strong>{' '}
        moves parallel positions and sets IN THE BASS. No Tilt mode reaches the
        same floors from the Voicing and IN THE BASS dropdowns on the diagram.
      </HelpCallout>
      {ELEVATOR_MOTION_TOPICS.map((topic) => (
        <div key={topic.title} className="help-article__subsection">
          <h4 className="help-article__subsection-title">{topic.title}</h4>
          <p>
            <strong>Mechanic:</strong> {topic.mechanic}
          </p>
          <p>
            <strong>Application:</strong> {topic.application}
          </p>
          <HelpCallout>{topic.movemental}</HelpCallout>
          {topic.title === 'Contrary motion' && (
            <>
              <p>
                <strong>Scale of chords:</strong>{' '}
                {ELEVATOR_CONTRARY_ON_OFF_BODY}
              </p>
              <p>{ELEVATOR_CONTRARY_BIGGER_INTERVALS_BODY}</p>
            </>
          )}
        </div>
      ))}
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">Subset and superset</h3>
      <p>
        Treat a full chord shape as a superset. Small subset intervals inside
        that frame can move on their own. An inner voice might walk through
        thirds or fifths while a Drop 2 outer shell stays fixed, adding subtle
        voice-leading under a sustained melody.
      </p>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">Voicing and the bass</h3>
      <p>{ELEVATOR_VOICING_BASS_NOTE}</p>
    </section>
  </HelpArticleLayout>
);
