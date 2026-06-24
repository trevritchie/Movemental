import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Tone from 'tone';

const midiRecorderMock = vi.hoisted(() => ({
  start: vi.fn(),
  reset: vi.fn(),
  isRecording: vi.fn(() => false),
  logNoteOns: vi.fn(),
  logNoteOffs: vi.fn(),
  logAllNotesOff: vi.fn(),
  encode: vi.fn(async () => new Blob(['midi'], { type: 'audio/midi' })),
}));

vi.mock('./SessionMidiRecorder', () => ({
  SessionMidiRecorder: vi.fn(function SessionMidiRecorder() {
    return midiRecorderMock;
  }),
  pairEventsIntoNotes: vi.fn(),
}));

vi.mock('./SessionRecorder', () => ({
  SessionRecorder: {
    isSupported: vi.fn(() => true),
    create: vi.fn(() => ({
      attachSource: vi.fn(),
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => new Blob(['audio'], { type: 'audio/webm' })),
    })),
  },
}));

import { AudioEngine } from './AudioEngine';

describe('AudioEngine session MIDI recording', () => {
  let engine: AudioEngine;

  beforeEach(async () => {
    vi.clearAllMocks();
    midiRecorderMock.isRecording.mockReturnValue(false);
    engine = new AudioEngine();
    await engine.startContext();
  });

  it('starts the MIDI recorder when audio recording starts', async () => {
    vi.mocked(Tone.now).mockReturnValue(12.5);

    await engine.startRecording();

    expect(midiRecorderMock.start).toHaveBeenCalledWith(12.5);
  });

  it('returns audio and MIDI blobs when recording stops', async () => {
    vi.mocked(Tone.now).mockReturnValue(99);

    await engine.startRecording();
    const result = await engine.stopRecording();

    expect(result.audio.type).toBe('audio/webm');
    expect(result.midi.type).toBe('audio/midi');
    expect(midiRecorderMock.encode).toHaveBeenCalledWith(99);
  });

  it('logs playNotes events while MIDI recording is active', () => {
    midiRecorderMock.isRecording.mockReturnValue(true);
    vi.mocked(Tone.now).mockReturnValue(2);

    engine.playNotes([60, 64], '2n');

    expect(midiRecorderMock.logNoteOns).toHaveBeenCalledWith(
      [60, 64],
      undefined,
      2.015,
    );
    expect(midiRecorderMock.logNoteOffs).toHaveBeenCalledWith(
      [60, 64],
      3.015,
    );
  });

  it('logs all notes off when releaseActiveNotes runs during recording', () => {
    midiRecorderMock.isRecording.mockReturnValue(true);
    vi.mocked(Tone.now).mockReturnValue(5);

    engine.releaseActiveNotes();

    expect(midiRecorderMock.logAllNotesOff).toHaveBeenCalledWith(5);
  });
});
