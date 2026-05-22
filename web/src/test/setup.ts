import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Web Audio API
class MockAudioContext {
  state = 'suspended';
  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createGain = vi.fn(() => ({
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn(),
  }));
  createOscillator = vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { setValueAtTime: vi.fn() },
  }));
  destination = {};
}

Object.defineProperty(window, 'AudioContext', {
  value: MockAudioContext,
  writable: true,
});

Object.defineProperty(window, 'webkitAudioContext', {
  value: MockAudioContext,
  writable: true,
});

// Mock Tone.js
vi.mock('tone', () => {
  const mockNow = vi.fn(() => 0);
  const mockFrequency = vi.fn((n) => ({
    toNote: () => {
      const notes = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
      return notes[n % 12] + Math.floor(n / 12 - 1);
    }
  }));

  class PolySynth {
    toDestination = vi.fn().mockReturnThis();
    connect = vi.fn().mockReturnThis();
    triggerAttackRelease = vi.fn();
    triggerAttack = vi.fn();
    triggerRelease = vi.fn();
    releaseAll = vi.fn();
    volume = { value: 0 };
    set = vi.fn();
    maxPolyphony = 12;
  }

  class Synth {
    toDestination = vi.fn().mockReturnThis();
    connect = vi.fn().mockReturnThis();
    triggerAttackRelease = vi.fn();
    triggerAttack = vi.fn();
    triggerRelease = vi.fn();
    releaseAll = vi.fn();
    volume = { value: 0 };
    set = vi.fn();
  }

  class Filter {
    connect = vi.fn().mockReturnThis();
  }

  class Chorus {
    connect = vi.fn().mockReturnThis();
    start = vi.fn();
    wet = { value: 0.35 };
  }

  class PingPongDelay {
    connect = vi.fn().mockReturnThis();
    wet = { value: 0.0 };
  }

  class Reverb {
    connect = vi.fn().mockReturnThis();
    generate = vi.fn().mockResolvedValue(undefined);
    wet = { value: 0.3 };
  }

  class EQ3 {
    connect = vi.fn().mockReturnThis();
  }

  class Compressor {
    connect = vi.fn().mockReturnThis();
  }

  class Limiter {
    connect = vi.fn().mockReturnThis();
    toDestination = vi.fn().mockReturnThis();
    constructor() {}
  }

  return {
    start: vi.fn().mockResolvedValue(undefined),
    now: mockNow,
    Frequency: mockFrequency,
    PolySynth,
    Synth,
    Filter,
    Chorus,
    PingPongDelay,
    Reverb,
    EQ3,
    Compressor,
    Limiter,
  };
});
