/**
 * Shared layout for nested harmonic theory help articles.
 */
import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export interface HelpVideoLink {
  url: string;
  title?: string;
  label?: string;
}

interface HelpArticleLayoutProps {
  backLabel?: string;
  onBack: () => void;
  attribution: React.ReactNode;
  videoUrl?: string;
  videoTitle?: string;
  videoLinks?: HelpVideoLink[];
  children: React.ReactNode;
}

export const HELP_REFERENCE_VIDEO_LABEL = 'Watch reference video on YouTube';

export const HelpArticleLayout: React.FC<HelpArticleLayoutProps> = ({
  backLabel = 'Help',
  onBack,
  attribution,
  videoUrl,
  videoTitle,
  videoLinks,
  children,
}) => {
  const links: HelpVideoLink[] =
    videoLinks && videoLinks.length > 0
      ? videoLinks
      : videoUrl
        ? [
            {
              url: videoUrl,
              title: videoTitle,
              label: videoTitle || HELP_REFERENCE_VIDEO_LABEL,
            },
          ]
        : [];

  return (
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

      <div className="help-article__header">
        <p className="help-article__attribution">{attribution}</p>

        {links.map((link) => {
          const displayLabel = link.title || link.label || HELP_REFERENCE_VIDEO_LABEL;
          return (
            <a
              key={link.url}
              className="help-article__video-link"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${displayLabel} (opens in new tab)`}
            >
              <ExternalLink size={18} aria-hidden="true" />
              <span>{displayLabel}</span>
            </a>
          );
        })}
      </div>

      <div className="help-article__body">{children}</div>
    </div>
  );
};

