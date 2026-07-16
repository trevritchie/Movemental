import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsSettingHeader } from './SettingsSettingHeader';

describe('SettingsSettingHeader', () => {
  const onReset = vi.fn();

  beforeEach(() => {
    onReset.mockClear();
  });

  it('renders setting title and calls onReset with group id', () => {
    render(<SettingsSettingHeader groupId="playStyle" onReset={onReset} />);

    expect(
      screen.getByRole('heading', { name: 'Sustain Mode' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset Sustain Mode to defaults' }),
    );
    expect(onReset).toHaveBeenCalledWith('playStyle');
  });
});
