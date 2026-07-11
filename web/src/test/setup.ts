import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Web Audio API
class MockAudioContext {
  state = 'running';
  sampleRate = 44100;
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
  createBuffer = vi.fn(() => ({}));
  createBufferSource = vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
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

Object.defineProperty(navigator, 'audioSession', {
  value: { type: 'auto' },
  configurable: true,
  writable: true,
});

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  value: MockResizeObserver,
  writable: true,
});

Object.defineProperty(navigator, 'maxTouchPoints', {
  value: 0,
  configurable: true,
  writable: true,
});

// Mock Tone.js
vi.mock('tone', () => {
  const mockNow = vi.fn(() => 0);
  const mockFrequency = vi.fn((value: number | string) => ({
    toNote: () => {
      if (typeof value === 'string') {
        return value;
      }

      const notes = [
        'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
      ];
      return notes[value % 12] + Math.floor(value / 12 - 1);
    },
    toMidi: () => (typeof value === 'number' ? value : 60),
  }));

  class Gain {
    gain = { value: 1, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn().mockReturnThis();
  }

  const Time = vi.fn((duration: string) => ({
    toSeconds: () => (duration === '2n' ? 1 : 0.5),
  }));

  class PolySynth {
    toDestination = vi.fn().mockReturnThis();
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn().mockReturnThis();
    dispose = vi.fn();
    triggerAttackRelease = vi.fn();
    triggerAttack = vi.fn();
    triggerRelease = vi.fn();
    releaseAll = vi.fn();
    volume = { value: 0 };
    set = vi.fn();
    maxPolyphony = 12;
  }

  class Sampler {
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn().mockReturnThis();
    dispose = vi.fn();
    triggerAttackRelease = vi.fn();
    triggerAttack = vi.fn();
    triggerRelease = vi.fn();
    releaseAll = vi.fn();
    volume = { value: 0 };
    set = vi.fn();

    constructor(options?: { onload?: () => void }) {
      queueMicrotask(() => {
        options?.onload?.();
      });
    }
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

  class FMSynth extends Synth {}
  class AMSynth extends Synth {}
  class MonoSynth extends Synth {}

  class Filter {
    frequency = { value: 900 };
    connect = vi.fn().mockReturnThis();
  }

  class Distortion {
    distortion = 0;
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
    low = { value: -6 };
    mid = { value: 2.5 };
    high = { value: -2.5 };
    lowFrequency = { value: 180 };
    highFrequency = { value: 2400 };
    connect = vi.fn().mockReturnThis();
  }

  class Compressor {
    threshold = { value: -16 };
    ratio = { value: 4 };
    knee = { value: 4 };
    attack = { value: 0.03 };
    release = { value: 0.08 };
    connect = vi.fn().mockReturnThis();
  }

  class Limiter {
    threshold = { value: -1 };
    connect = vi.fn().mockReturnThis();
    toDestination = vi.fn().mockReturnThis();
    constructor() {}
  }

  class Meter {
    getValue = vi.fn(() => -12);
    connect = vi.fn().mockReturnThis();
  }

  let activeContext: Context | null = null;

  class Context {
    lookAhead = 0.1;
    updateInterval = 0.05;
    latencyHint = 'interactive';
    sampleRate = 44100;
    rawContext = {
      state: 'running',
      baseLatency: 0,
      outputLatency: 0.01,
      destination: {},
      currentTime: 0,
      suspend: vi.fn().mockResolvedValue(undefined),
    };
    resume = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
    createConstantSource = vi.fn(() => ({
      offset: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    }));
    createAnalyser = vi.fn(() => ({
      fftSize: 2048,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getFloatTimeDomainData: vi.fn(),
    }));

    constructor(
      options?: Partial<{
        lookAhead: number;
        latencyHint: string;
        updateInterval: number;
      }>,
    ) {
      if (options?.lookAhead != null) {
        this.lookAhead = options.lookAhead;
      }
      if (options?.latencyHint != null) {
        this.latencyHint = options.latencyHint;
      }
      if (options?.updateInterval != null) {
        this.updateInterval = options.updateInterval;
      }
    }
  }

  const setContext = vi.fn((context: Context) => {
    activeContext = context;
  });

  const getContext = vi.fn(() => activeContext ?? new Context());

  const transportMock = { cancel: vi.fn() };
  const getTransport = vi.fn(() => transportMock);

  return {
    start: vi.fn().mockResolvedValue(undefined),
    now: mockNow,
    Frequency: mockFrequency,
    Time,
    Gain,
    PolySynth,
    Sampler,
    Synth,
    FMSynth,
    AMSynth,
    MonoSynth,
    Filter,
    Distortion,
    Chorus,
    PingPongDelay,
    Reverb,
    EQ3,
    Compressor,
    Limiter,
    Meter,
    Context,
    setContext,
    getContext,
    getTransport,
  };
});
