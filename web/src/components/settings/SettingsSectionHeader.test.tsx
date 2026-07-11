import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsSectionHeader } from './SettingsSectionHeader';

describe('SettingsSectionHeader', () => {
  const onReset = vi.fn();

  beforeEach(() => {
    onReset.mockClear();
  });

  it('renders section title and calls onReset with section id', () => {
    render(<SettingsSectionHeader sectionId="general" onReset={onReset} />);

    expect(screen.getByRole('heading', { name: 'Playback' })).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset Playback to defaults' })
    );
    expect(onReset).toHaveBeenCalledWith('general');
  });
});
