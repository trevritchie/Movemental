/**
 * Shared layout for nested harmonic theory help articles.
 */
import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';

interface HelpArticleLayoutProps {
  backLabel?: string;
  onBack: () => void;
  attribution: React.ReactNode;
  videoUrl: string;
  children: React.ReactNode;
}

export const HELP_REFERENCE_VIDEO_LABEL = 'Watch reference video on YouTube';

export const HelpArticleLayout: React.FC<HelpArticleLayoutProps> = ({
  backLabel = 'Help',
  onBack,
  attribution,
  videoUrl,
  children,
}) => (
  <div className="help-page help-article">
    <div className="help-page__toolbar">
      <button
        type="button"
        className="help-page__back"
        onClick={onBack}
        aria-label={`Back to ${backLabel}`}
      >
        <ArrowLeft size={18} />
        <span>{backLabel}</span>
      </button>
    </div>

    <p className="help-article__attribution">{attribution}</p>

    <a
      className="help-article__video-link"
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${HELP_REFERENCE_VIDEO_LABEL} (opens in new tab)`}
    >
      <ExternalLink size={18} aria-hidden="true" />
      <span>{HELP_REFERENCE_VIDEO_LABEL}</span>
    </a>

    <div className="help-article__body">{children}</div>
  </div>
);
