import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsSubsectionHeader } from './SettingsSubsectionHeader';

describe('SettingsSubsectionHeader', () => {
  const onReset = vi.fn();

  beforeEach(() => {
    onReset.mockClear();
  });

  it('renders subsection title as h4 and calls onReset with section id', () => {
    render(
      <SettingsSubsectionHeader sectionId="voiceLeading" onReset={onReset} />,
    );

    expect(
      screen.getByRole('heading', { level: 4, name: 'Voice Leading' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset Voice Leading to defaults' }),
    );
    expect(onReset).toHaveBeenCalledWith('voiceLeading');
  });
});
