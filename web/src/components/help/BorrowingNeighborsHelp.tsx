/**
 * Barry Harris neighbor borrowing and scale of chords help article.
 */
import React from 'react';
import { HelpArticleLayout } from './HelpArticleLayout';
import { HelpCallout } from './HelpCallout';
import {
  BORROWING_ADVANCED_BODY,
  BORROWING_BRANCH_EXAMPLE_BODY,
  BORROWING_DIAGRAM_PRACTICE_BODY,
  BORROWING_DIAGRAM_PRACTICE_MOVEMENTAL,
  BORROWING_MOVEMENTAL_BODY,
  BORROWING_NEIGHBOR_TONES_BODY,
  BORROWING_NEIGHBORS_ATTRIBUTION,
  BORROWING_NEIGHBORS_INTRO,
  BORROWING_NEIGHBORS_VIDEO_URL,
  BORROWING_ON_OFF_TERMS,
  BORROWING_PRACTICE_METHODS,
  BORROWING_SCALE_MIXING_BODY,
  BORROWING_SCALE_ON_OFF_BODY,
} from './helpTheoryContent';

interface BorrowingNeighborsHelpProps {
  onBack: () => void;
}

export const BorrowingNeighborsHelp: React.FC<BorrowingNeighborsHelpProps> = ({
  onBack,
}) => (
  <HelpArticleLayout
    onBack={onBack}
    attribution={BORROWING_NEIGHBORS_ATTRIBUTION}
    videoUrl={BORROWING_NEIGHBORS_VIDEO_URL}
  >
    <section className="help-page__section">
      <p className="help-article__lede">{BORROWING_NEIGHBORS_INTRO}</p>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">
        The eight-note scale of chords
      </h3>
      <p>{BORROWING_SCALE_ON_OFF_BODY}</p>
      <ul className="help-article__list">
        {BORROWING_ON_OFF_TERMS.map((term) => (
          <li key={term.name} className="help-article__list-item">
            <strong>{term.name}:</strong> {term.description}
          </li>
        ))}
      </ul>
      <p>{BORROWING_SCALE_MIXING_BODY}</p>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">Example: Branch and Fire</h3>
      <p>{BORROWING_BRANCH_EXAMPLE_BODY}</p>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">Why each tone has neighbors</h3>
      <p>{BORROWING_NEIGHBOR_TONES_BODY}</p>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">Borrowing from the neighbors</h3>
      <ol className="help-article__list help-article__list--ordered">
        {BORROWING_PRACTICE_METHODS.map((method) => (
          <li key={method.label} className="help-article__list-item">
            <strong>{method.label}:</strong> {method.description}
          </li>
        ))}
      </ol>
    </section>

    <section className="help-page__section">
      <HelpCallout label="In Movemental: the sliders">
        {BORROWING_MOVEMENTAL_BODY}
      </HelpCallout>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">Practice on the diagram</h3>
      <p>{BORROWING_DIAGRAM_PRACTICE_BODY}</p>
      <HelpCallout>{BORROWING_DIAGRAM_PRACTICE_MOVEMENTAL}</HelpCallout>
    </section>

    <section className="help-page__section">
      <h3 className="help-page__section-title">Advanced borrowing</h3>
      <p>{BORROWING_ADVANCED_BODY}</p>
    </section>
  </HelpArticleLayout>
);
