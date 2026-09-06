import React from 'react';

export function renderFormattedTourText(text: string): React.ReactNode {
  const paragraphs = text.split(/\n\s*\n/);

  return paragraphs.map((paragraph, pIdx) => {
    const lines = paragraph.split('\n');
    return (
      <p key={pIdx} className="tour-popover__paragraph">
        {lines.map((line, lIdx) => {
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <React.Fragment key={lIdx}>
              {lIdx > 0 && <br />}
              {parts.map((part, partIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={partIdx}>
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </React.Fragment>
          );
        })}
      </p>
    );
  });
}
