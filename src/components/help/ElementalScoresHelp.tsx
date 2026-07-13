/**
 * Elemental Scores help page: common tunes with score images.
 */
import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import {
  ELEMENTAL_SCORES,
  elementalScoreUrl,
} from './elementalScoresData';

interface ElementalScoresHelpProps {
  onBack: () => void;
}

export const ElementalScoresHelp: React.FC<ElementalScoresHelpProps> = ({
  onBack,
}) => (
  <div className="help-page help-article">
    <div className="help-page__toolbar">
      <button
        type="button"
        className="help-page__back"
        onClick={onBack}
        aria-label="Back to Help"
      >
        <ArrowLeft size={18} />
        <span>Help</span>
      </button>
    </div>

    <p className="help-article__lede">Learn to play common tunes</p>

    <ul className="help-page__score-list">
      {ELEMENTAL_SCORES.map((score) => (
        <li key={score.filename}>
          <a
            className="help-page__score-link"
            href={elementalScoreUrl(score.filename)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{score.title}</span>
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  </div>
);
