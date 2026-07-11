/**
 * Barry Harris Creation Theory help article.
 */
import React from 'react';
import { HelpArticleLayout } from './HelpArticleLayout';
import { HelpCallout } from './HelpCallout';
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
      <p className="help-article__lede">{CREATION_THEORY_INTRO}</p>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">Two Diminished Parents</h3>
      <p>{CREATION_TWO_PARENTS_BODY}</p>
    </section>

    <section className="help-page__section">
      <HelpCallout>{CREATION_MOVEMENTAL_BODY}</HelpCallout>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">
        Brothers and Sisters
      </h3>
      <p>{CREATION_ONE_NOTE_LOWER_BODY}</p>
      <p>{CREATION_ONE_NOTE_LOWER_SIBLINGS_BODY}</p>
      <p>{CREATION_ONE_NOTE_LOWER_DIAGRAM_BODY}</p>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">Adjacent Moves on the Diagram</h3>
      <p>{CREATION_ADJACENT_NAV_BODY}</p>
      <HelpCallout>{CREATION_ADJACENT_NAV_MOVEMENTAL}</HelpCallout>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">Scale of Chords in Practice</h3>
      <p>{CREATION_SCALE_PRACTICE_BODY}</p>
      <HelpCallout>{CREATION_SCALE_PRACTICE_MOVEMENTAL}</HelpCallout>
      <p>{CREATION_NEIGHBORS_LINK}</p>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">Lowering More Notes</h3>
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
      <h3 className="help-page__section-title">Beyond the Diagram</h3>
      <p>{CREATION_BEFORE_DIAGRAM_INTRO}</p>
      <p>{CREATION_CHROMATIC_UNIVERSE_BODY}</p>
      <p>{CREATION_DIMINISHED_FROM_WHOLE_TONE_BODY}</p>
    </section>
  </HelpArticleLayout>
);
