/// <reference types="node" />
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SplashPage } from './SplashPage';

describe('SplashPage', () => {
  it('should render the mobile ringer warning', () => {
    const onEnter = vi.fn();
    render(<SplashPage onEnter={onEnter} />);
    const warning = screen.getByText(/Mobile users: Please ensure your device's ringer is ON to hear audio/i);
    expect(warning).toBeInTheDocument();
  });
});
