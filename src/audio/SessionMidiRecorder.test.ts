import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SessionMidiRecorder,
  pairEventsIntoNotes,
} from './SessionMidiRecorder';

const mockAddNote = vi.fn();
const mockToArray = vi.fn(() => new Uint8Array([0x4d, 0x54, 0x68, 0x64]));
const mockAddTrack = vi.fn(() => ({
  name: '',
  channel: 0,
  instrument: { name: '' },
  addNote: mockAddNote,
}));

vi.mock('@tonejs/midi', () => ({
  Midi: vi.fn().mockImplementation(function Midi(this: {
    header: { name: string; tempos: unknown[] };
    addTrack: typeof mockAddTrack;
    toArray: typeof mockToArray;
  }) {
    this.header = { name: '', tempos: [] };
    this.addTrack = mockAddTrack;
    this.toArray = mockToArray;
  }),
}));

describe('SessionMidiRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs note on and off relative to the session start time', () => {
    const recorder = new SessionMidiRecorder();
    recorder.start(10);

    recorder.logNoteOn(60, 100, 10.5);
    recorder.logNoteOff(60, 11);

    expect(recorder.getEventsForTests()).toEqual([
      { type: 'on', midi: 60, timeSec: 0.5, velocity: 100 },
      { type: 'off', midi: 60, timeSec: 1, velocity: 100 },
    ]);
  });

  it('ignores duplicate note on while a pitch is held', () => {
    const recorder = new SessionMidiRecorder();
    recorder.start(0);

    recorder.logNoteOn(64);
    recorder.logNoteOn(64);

    expect(recorder.getEventsForTests()).toHaveLength(1);
  });

  it('encodes paired events into a MIDI blob', async () => {
    const recorder = new SessionMidiRecorder();
    recorder.start(0);
    recorder.logNoteOn(60, 100, 0);
    recorder.logNoteOff(60, 0.5);

    const blob = await recorder.encode();

    expect(mockAddNote).toHaveBeenCalledWith({
      midi: 60,
      time: 0,
      duration: 0.5,
      velocity: expect.closeTo(100 / 127, 5),
    });
    expect(blob.type).toBe('audio/midi');
    expect(recorder.isRecording()).toBe(false);
  });
});

describe('pairEventsIntoNotes', () => {
  it('pairs overlapping notes on the same pitch using a stack', () => {
    const notes = pairEventsIntoNotes([
      { type: 'on', midi: 60, timeSec: 0, velocity: 100 },
      { type: 'on', midi: 60, timeSec: 0.2, velocity: 100 },
      { type: 'off', midi: 60, timeSec: 0.4, velocity: 100 },
      { type: 'off', midi: 60, timeSec: 0.6, velocity: 100 },
    ]);

    expect(notes).toEqual([
      {
        midi: 60,
        time: 0.2,
        duration: 0.2,
        velocity: expect.closeTo(100 / 127, 5),
      },
      {
        midi: 60,
        time: 0,
        duration: 0.6,
        velocity: expect.closeTo(100 / 127, 5),
      },
    ]);
  });
});
