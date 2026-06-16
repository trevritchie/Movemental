import { describe, it, expect } from 'vitest';
import { formatTraditionalName } from './traditionalName';

describe('formatTraditionalName', () => {
  it('adds relative min7 for maj6', () => {
    expect(formatTraditionalName(0, ' maj6')).toBe('C maj6 / A min7');
    expect(formatTraditionalName(10, ' maj6')).toBe('Bb maj6 / G min7');
  });

  it('adds relative min7b5 for min6', () => {
    expect(formatTraditionalName(0, ' min6')).toBe('C min6 / A min7b5');
    expect(formatTraditionalName(10, ' min6')).toBe('Bb min6 / G min7b5');
  });

  it('formats 7b5 without a space', () => {
    expect(formatTraditionalName(10, '7b5')).toBe('Bb7b5');
    expect(formatTraditionalName(0, '7b5')).toBe('C7b5');
  });

  it('leaves dim7 and dom7 unchanged', () => {
    expect(formatTraditionalName(0, ' dim7')).toBe('C dim7');
    expect(formatTraditionalName(10, '7')).toBe('Bb7');
  });
});
