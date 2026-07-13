/**
 * In-memory MIDI note log encoded to Standard MIDI File on session stop.
 */
import { clamp } from '../utils/clamp';

const DEFAULT_VELOCITY = 100;
const DEFAULT_BPM = 120;
const MIN_NOTE_DURATION_SEC = 0.01;

interface MidiEvent {
  type: 'on' | 'off';
  midi: number;
  timeSec: number;
  velocity: number;
}

interface EncodedNote {
  midi: number;
  time: number;
  duration: number;
  velocity: number;
}

/**
 * In-memory note event log encoded to Standard MIDI File on stop.
 *
 * Events are captured at the same AudioEngine call sites as synth
 * triggerAttack/triggerRelease (not from the Web Audio graph). MIDI exports
 * note timing only: no effects, borrowing CC, or ADSR release tails.
 * WebM from SessionRecorder carries the rendered sound.
 */
export class SessionMidiRecorder {
  private recording = false;
  private startToneTime = 0;
  private events: MidiEvent[] = [];
  private heldNotes = new Set<number>();

  isRecording(): boolean {
    return this.recording;
  }

  start(startToneTime: number): void {
    this.reset();
    this.recording = true;
    this.startToneTime = startToneTime;
  }

  reset(): void {
    this.recording = false;
    this.startToneTime = 0;
    this.events = [];
    this.heldNotes.clear();
  }

  logNoteOn(
    midi: number,
    velocity: number = DEFAULT_VELOCITY,
    toneTime?: number,
  ): void {
    if (!this.recording) {
      return;
    }

    const clampedMidi = clamp(Math.round(midi), 0, 127);
    // Skip duplicate on-events while a pitch is already held.
    if (this.heldNotes.has(clampedMidi)) {
      return;
    }

    this.heldNotes.add(clampedMidi);
    this.events.push({
      type: 'on',
      midi: clampedMidi,
      timeSec: this.relativeTime(toneTime),
      velocity,
    });
  }

  logNoteOff(midi: number, toneTime?: number): void {
    if (!this.recording) {
      return;
    }

    const clampedMidi = clamp(Math.round(midi), 0, 127);
    if (!this.heldNotes.has(clampedMidi)) {
      return;
    }

    this.heldNotes.delete(clampedMidi);
    this.events.push({
      type: 'off',
      midi: clampedMidi,
      timeSec: this.relativeTime(toneTime),
      velocity: DEFAULT_VELOCITY,
    });
  }

  logNoteOns(
    midiNotes: number[],
    velocity: number = DEFAULT_VELOCITY,
    toneTime?: number,
  ): void {
    for (const midi of midiNotes) {
      this.logNoteOn(midi, velocity, toneTime);
    }
  }

  logNoteOffs(midiNotes: number[], toneTime?: number): void {
    for (const midi of midiNotes) {
      this.logNoteOff(midi, toneTime);
    }
  }

  logAllNotesOff(toneTime?: number): void {
    if (!this.recording) {
      return;
    }

    const active = [...this.heldNotes];
    for (const midi of active) {
      this.logNoteOff(midi, toneTime);
    }
  }

  /**
   * Build a single-track SMF blob. @tonejs/midi is dynamic-imported so the
   * encoder stays out of the initial bundle and the real-time note log path.
   */
  async encode(endToneTime?: number): Promise<Blob> {
    // Panic any still-held notes so encode never emits stuck note-ons.
    if (this.heldNotes.size > 0) {
      this.logAllNotesOff(endToneTime);
    }

    const notes = pairEventsIntoNotes(this.events);
    const { Midi } = await import('@tonejs/midi');
    const midi = new Midi();
    midi.header.name = 'Movemental Session';
    midi.header.tempos = [{ bpm: DEFAULT_BPM, ticks: 0, time: 0 }];

    const track = midi.addTrack();
    track.name = 'Movemental Performance';
    track.channel = 0;
    track.instrument.name = 'acoustic grand piano';

    for (const note of notes) {
      track.addNote({
        midi: note.midi,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity,
      });
    }

    this.reset();
    const bytes = new Uint8Array(midi.toArray());
    return new Blob([bytes], { type: 'audio/midi' });
  }

  /** Exposed for unit tests. */
  getEventsForTests(): readonly MidiEvent[] {
    return this.events;
  }

  private relativeTime(toneTime?: number): number {
    const absoluteTime = toneTime ?? this.startToneTime;
    return Math.max(0, absoluteTime - this.startToneTime);
  }
}

/** Pair on/off events per pitch (LIFO stack) into @tonejs/midi note spans. */
function pairEventsIntoNotes(events: MidiEvent[]): EncodedNote[] {
  const sorted = [...events].sort((a, b) => {
    if (a.timeSec !== b.timeSec) {
      return a.timeSec - b.timeSec;
    }

    if (a.type === b.type) {
      return a.midi - b.midi;
    }

    return a.type === 'off' ? -1 : 1;
  });

  const activeStacks = new Map<number, Array<{ timeSec: number; velocity: number }>>();
  const notes: EncodedNote[] = [];

  for (const event of sorted) {
    if (event.type === 'on') {
      const stack = activeStacks.get(event.midi) ?? [];
      stack.push({ timeSec: event.timeSec, velocity: event.velocity });
      activeStacks.set(event.midi, stack);
      continue;
    }

    const stack = activeStacks.get(event.midi);
    if (!stack || stack.length === 0) {
      continue;
    }

    const start = stack.pop()!;
    if (stack.length === 0) {
      activeStacks.delete(event.midi);
    }

    notes.push({
      midi: event.midi,
      time: start.timeSec,
      duration: Math.max(MIN_NOTE_DURATION_SEC, event.timeSec - start.timeSec),
      velocity: start.velocity / 127,
    });
  }

  return notes;
}

export { pairEventsIntoNotes };
