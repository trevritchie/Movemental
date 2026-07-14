/**
 * Session capture attached to the master bus limiter tap.
 *
 * Owns recorder wiring, stop fade on the recorder-only gain, and parallel MIDI
 * note logging so AudioEngine can stay focused on voice and DSP.
 */
import * as Tone from 'tone';
import { SessionRecorder } from './SessionRecorder';
import { SessionMidiRecorder } from './SessionMidiRecorder';

export const RECORDING_STOP_FADE_MS = 300;

/** Extra wait after the scheduled ramp so stop() never clips the fade tail. */
const RECORDING_FADE_SAFETY_MS = 50;
/** Near-silence target for the recorder-only tap during stop fade. */
const RECORDING_TAP_MIN_GAIN = 0.001;

const audioDebugLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.debug(...args);
  }
};

const devWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
};

export class SessionRecordingController {
  /** Recorder-only tap; faded before stop so live speakers are unaffected. */
  private recordTailGain: Tone.Gain | null = null;
  private recordingFadeTimer: ReturnType<typeof setTimeout> | null = null;
  /** Resolves the in-flight fadeOutTap Promise; cleared with the timer. */
  private fadeResolve: (() => void) | null = null;
  private sessionRecorder: SessionRecorder | null = null;
  private sessionMidiRecorder = new SessionMidiRecorder();

  isSupported(): boolean {
    return SessionRecorder.isSupported();
  }

  isMidiRecording(): boolean {
    return this.sessionMidiRecorder.isRecording();
  }

  /**
   * Attach SessionRecorder to limiter -> recordTailGain when the bus is ready.
   */
  ensureAttached(limiter: Tone.Limiter | null): void {
    if (!limiter || this.sessionRecorder) {
      return;
    }

    const recorder = SessionRecorder.create();
    if (!recorder) {
      devWarn(
        '[SessionRecording] Session recording is not supported in this browser',
      );
      return;
    }

    if (!this.recordTailGain) {
      // Branch off the limiter so fade/stop only affects the recorder tap.
      this.recordTailGain = new Tone.Gain(1);
      limiter.connect(this.recordTailGain);
    }

    recorder.attachSource(this.recordTailGain);
    this.sessionRecorder = recorder;
    audioDebugLog(
      '[SessionRecording] Session recorder attached via record tail gain',
    );
  }

  async start(ensureEngineReady: () => Promise<void>): Promise<void> {
    await ensureEngineReady();
    if (!this.sessionRecorder) {
      throw new Error('Session recording is not supported in this browser');
    }

    await this.sessionRecorder.start();
    // Align MIDI timeline with the audio session start (Tone transport clock).
    this.sessionMidiRecorder.start(Tone.now());
    audioDebugLog('[SessionRecording] Session recording started');
  }

  /**
   * Finalize audio and MIDI in parallel. encode() flushes any held MIDI notes
   * at endTime (instant panic, not synth ADSR length).
   */
  async stop(): Promise<{ audio: Blob; midi: Blob }> {
    if (!this.sessionRecorder) {
      throw new Error('Session recorder is not initialized');
    }

    const endTime = Tone.now();
    const [audio, midi] = await Promise.all([
      this.sessionRecorder.stop(),
      this.sessionMidiRecorder.encode(endTime),
    ]);
    audioDebugLog('[SessionRecording] Session recording stopped');
    return { audio, midi };
  }

  /**
   * Ramp the recorder-only tap to silence before stop() to avoid end-of-file clicks.
   */
  async fadeOutTap(
    ensureEngineReady: () => Promise<void>,
    durationMs: number = RECORDING_STOP_FADE_MS,
  ): Promise<void> {
    await ensureEngineReady();

    if (!this.recordTailGain) {
      return;
    }

    await this.scheduleTapFade(1, RECORDING_TAP_MIN_GAIN, durationMs);
  }

  /** Restore recorder tap gain after a stop fade. */
  resetTailGain(): void {
    this.clearFadeTimer();

    if (!this.recordTailGain) {
      return;
    }

    const now = Tone.now();
    const gainParam = this.recordTailGain.gain;
    gainParam.cancelScheduledValues(now);
    gainParam.setValueAtTime(1, now);
  }

  cancelScheduledTapGain(now: number = Tone.now()): void {
    if (this.recordTailGain) {
      this.recordTailGain.gain.cancelScheduledValues(now);
    }
  }

  clearFadeTimer(): void {
    if (this.recordingFadeTimer !== null) {
      clearTimeout(this.recordingFadeTimer);
      this.recordingFadeTimer = null;
    }
    // Resolve any awaiting fadeOutTap so resetTailGain / overlapping fades
    // cannot leave stop() hung on an orphaned Promise.
    const resolve = this.fadeResolve;
    this.fadeResolve = null;
    resolve?.();
  }

  logNoteOns(
    midiNotes: number[],
    velocity?: number,
    time?: number,
  ): void {
    if (!this.sessionMidiRecorder.isRecording()) {
      return;
    }
    this.sessionMidiRecorder.logNoteOns(midiNotes, velocity, time);
  }

  logNoteOffs(midiNotes: number[], time?: number): void {
    if (!this.sessionMidiRecorder.isRecording()) {
      return;
    }
    this.sessionMidiRecorder.logNoteOffs(midiNotes, time);
  }

  logAllNotesOff(time?: number): void {
    if (!this.sessionMidiRecorder.isRecording()) {
      return;
    }
    this.sessionMidiRecorder.logAllNotesOff(time);
  }

  private scheduleTapFade(
    fromGain: number,
    toGain: number,
    durationMs: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      this.clearFadeTimer();
      this.fadeResolve = resolve;

      const durationSec = durationMs / 1000;
      const now = Tone.now();
      const gainParam = this.recordTailGain!.gain;

      gainParam.cancelScheduledValues(now);
      gainParam.setValueAtTime(fromGain, now);
      gainParam.exponentialRampToValueAtTime(toGain, now + durationSec);

      this.recordingFadeTimer = setTimeout(() => {
        this.recordingFadeTimer = null;
        this.fadeResolve = null;
        resolve();
      }, durationMs + RECORDING_FADE_SAFETY_MS);
    });
  }
}
