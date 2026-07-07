/**
 * Barry Harris Creation Theory help article.
 */
import React from 'react';
import { HelpArticleLayout } from './HelpArticleLayout';
import {
  CREATION_ADJACENT_NAV_BODY,
  CREATION_ADJACENT_NAV_MOVEMENTAL,
  CREATION_BEFORE_DIAGRAM_INTRO,
  CREATION_CHROMATIC_UNIVERSE_BODY,
  CREATION_DIMINISHED_FROM_WHOLE_TONE_BODY,
  CREATION_DEEPER_LOWERING_INTRO,
  CREATION_LOWERING_RULES,
  CREATION_MOVEMENTAL_BODY,
  CREATION_ONE_NOTE_LOWER_BODY,
  CREATION_ONE_NOTE_LOWER_DIAGRAM_BODY,
  CREATION_ONE_NOTE_LOWER_SIBLINGS_BODY,
  CREATION_SCALE_PRACTICE_BODY,
  CREATION_SCALE_PRACTICE_MOVEMENTAL,
  CREATION_NEIGHBORS_LINK,
  CREATION_THEORY_ATTRIBUTION,
  CREATION_THEORY_INTRO,
  CREATION_THEORY_VIDEO_URL,
  CREATION_TWO_PARENTS_BODY,
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
    videoUrl={CREATION_THEORY_VIDEO_URL}
  >
    <section className="help-page__section">
      <p>{CREATION_THEORY_INTRO}</p>
    </section>

    <section className="help-page__section">
      <h4 className="help-page__section-title">Two diminished parents</h4>
      <p>{CREATION_TWO_PARENTS_BODY}</p>
    </section>

    <section className="help-page__section">
      <h4 className="help-page__section-title">In Movemental</h4>
      <p>{CREATION_MOVEMENTAL_BODY}</p>
    </section>

    <section className="help-page__section">
      <h4 className="help-page__section-title">
        Brothers and sisters
      </h4>
      <p>{CREATION_ONE_NOTE_LOWER_BODY}</p>
      <p>{CREATION_ONE_NOTE_LOWER_SIBLINGS_BODY}</p>
      <p>{CREATION_ONE_NOTE_LOWER_DIAGRAM_BODY}</p>
    </section>

    <section className="help-page__section">
      <h4 className="help-page__section-title">Adjacent moves on the diagram</h4>
      <p>{CREATION_ADJACENT_NAV_BODY}</p>
      <p className="help-article__subsection">
        <strong>In Movemental:</strong> {CREATION_ADJACENT_NAV_MOVEMENTAL}
      </p>
    </section>

    <section className="help-page__section">
      <h4 className="help-page__section-title">Scale of chords in practice</h4>
      <p>{CREATION_SCALE_PRACTICE_BODY}</p>
      <p className="help-article__subsection">
        <strong>In Movemental:</strong> {CREATION_SCALE_PRACTICE_MOVEMENTAL}
      </p>
      <p>{CREATION_NEIGHBORS_LINK}</p>
    </section>

    <section className="help-page__section">
      <h4 className="help-page__section-title">Lowering more notes</h4>
      <p>{CREATION_DEEPER_LOWERING_INTRO}</p>
      <ul className="help-article__list">
        {CREATION_LOWERING_RULES.map((rule) => (
          <li key={rule.label} className="help-article__list-item">
            <strong>{rule.label}:</strong> {rule.result}
          </li>
        ))}
      </ul>
    </section>

    <section className="help-page__section">
      <h4 className="help-page__section-title">Before the diagram</h4>
      <p>{CREATION_BEFORE_DIAGRAM_INTRO}</p>
      <p>{CREATION_CHROMATIC_UNIVERSE_BODY}</p>
      <p>{CREATION_DIMINISHED_FROM_WHOLE_TONE_BODY}</p>
    </section>
  </HelpArticleLayout>
);
