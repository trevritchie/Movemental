import * as Tone from 'tone';
import {
  unlockIosMediaChannel,
  waitForIosMediaChannel,
} from './iosMediaChannel';
import { SessionRecorder } from './SessionRecorder';
import { SessionMidiRecorder } from './SessionMidiRecorder';

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const devWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
};

export const RECORDING_STOP_FADE_MS = 300;

/** Extra wait after the scheduled ramp so stop() never clips the fade tail. */
const RECORDING_FADE_SAFETY_MS = 50;
/** Near-silence target for the recorder-only tap during stop fade. */
const RECORDING_TAP_MIN_GAIN = 0.001;

export class AudioEngine {
  private synth: Tone.PolySynth | null = null;
  private filter: Tone.Filter | null = null;
  private chorus: Tone.Chorus | null = null;
  private delay: Tone.PingPongDelay | null = null;
  private reverb: Tone.Reverb | null = null;
  private eq: Tone.EQ3 | null = null;
  private compressor: Tone.Compressor | null = null;
  private limiter: Tone.Limiter | null = null;
  /** Recorder-only tap; faded before stop so live speakers are unaffected. */
  private recordTailGain: Tone.Gain | null = null;
  private recordingFadeTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionRecorder: SessionRecorder | null = null;
  /** Parallel note log; no Web Audio nodes, negligible runtime cost. */
  private sessionMidiRecorder = new SessionMidiRecorder();
  private isReady: boolean = false;
  private activeNotes: string[] = [];
  private isPointerDown: boolean = false;

  // Cached effect intensity values (handles settings changed before AudioContext initialization)
  private chorusWetVal: number = 0.35;
  private delayWetVal: number = 0.0;
  private reverbWetVal: number = 0.30;

  // Cached envelope settings
  private envelopeAttackVal: number = 0.08;
  private envelopeDecayVal: number = 1.5;
  private envelopeSustainVal: number = 0.6;
  private envelopeReleaseVal: number = 1.2;

  constructor() {
    // Initialized on first user gesture via startContext()
  }

  private async initSynth() {
    // Signal chain: PolySynth -> Filter -> Chorus -> Delay -> Reverb -> EQ3 -> Compressor -> Limiter -> Destination

    // 8. Limiter - final peak control to guarantee no digital clipping
    this.limiter = new Tone.Limiter(-1.5).toDestination();

    // 7. Compressor - glues the polyphonic voices and smooths out transient spikes
    this.compressor = new Tone.Compressor({
      threshold: -16,
      ratio: 4.0,
      attack: 0.03,
      release: 0.08,
    });
    this.compressor.connect(this.limiter);

    // 6. EQ3 - Tailored specifically for laptop speaker translation:
    // - Low shelf cut (-6dB at 180Hz) to prevent speaker rattling and muddy distortion on small diaphragms.
    // - Presence boost (+2.5dB between 250Hz and 2400Hz) to bring out mid-range warmth and body.
    // - High shelf cut (-2.5dB) to smooth out synth brightness and tame high-register beeps.
    this.eq = new Tone.EQ3({
      low: -6,
      mid: 2.5,
      high: -2.5,
      lowFrequency: 180,
      highFrequency: 2400,
    });
    this.eq.connect(this.compressor);

    // 5. Reverb - creates a lush, diffuse, expensive space (async generation)
    this.reverb = new Tone.Reverb({
      decay: 3.5,
      wet: this.reverbWetVal,
      preDelay: 0.02,
    });
    this.reverb.connect(this.eq);
    await this.reverb.generate();

    // 4. Ping-Pong Delay - subtle bouncing ambient delay tail
    this.delay = new Tone.PingPongDelay({
      delayTime: "4n.", // dotted quarter note for rhythmic interest
      feedback: 0.25,
      wet: this.delayWetVal,
    });
    this.delay.connect(this.reverb);

    // 3. Chorus - adds high-end shimmer and incredible stereo width
    this.chorus = new Tone.Chorus({
      frequency: 1.5,
      delayTime: 3.5,
      depth: 0.7,
      wet: this.chorusWetVal,
    });
    this.chorus.connect(this.delay);
    this.chorus.start(); // Start the LFO for the chorus effect

    // 2. Master Lowpass Filter - analog warmth sweep applied to all voices collectively
    this.filter = new Tone.Filter({
      frequency: 900,       // low cutoff to keep fundamental warm and prevent harsh brightness
      type: 'lowpass',
      rolloff: -12,
    });
    this.filter.connect(this.chorus);

    // 1. Synthesizer - PolySynth wrapping standard Synth (highly optimized, 4x more CPU-efficient)
    // - Oscillator: fatsawtooth (3 detuned saw waves for rich, wide analog warmth)
    // - Envelopes: generous release for smooth ambient overlaps
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'fatsawtooth',
        count: 3,            // 3 detuned oscillators per voice
        spread: 15,          // tight detuning to maintain clear, focused harmonic body
      },
      envelope: {
        attack: this.envelopeAttackVal,        // prevents zero-crossing popping clicks
        decay: this.envelopeDecayVal,
        sustain: this.envelopeSustainVal,      // sits beautifully in the drone background
        release: this.envelopeReleaseVal,      // generous release for smooth legato transitions
      },
      volume: -12,           // balanced default volume to prevent summing distortion
    });
    this.synth.maxPolyphony = 12; // perfectly sized for 4-note voicing + release overlaps
    this.synth.connect(this.filter);

    this.ensureSessionRecorder();

    this.isReady = true;
    devLog('[AudioEngine] Optimized Premium PolySynth (Synth) & Master Filter ready');
  }

  private ensureSessionRecorder(): void {
    if (!this.limiter || this.sessionRecorder) {
      return;
    }

    const recorder = SessionRecorder.create();
    if (!recorder) {
      devWarn('[AudioEngine] Session recording is not supported in this browser');
      return;
    }

    if (!this.recordTailGain) {
      // Branch off the limiter so fade/stop only affects the recorder tap.
      this.recordTailGain = new Tone.Gain(1);
      this.limiter.connect(this.recordTailGain);
    }

    recorder.attachSource(this.recordTailGain);
    this.sessionRecorder = recorder;
    devLog('[AudioEngine] Session recorder attached via record tail gain');
  }

  public isRecordingSupported(): boolean {
    return SessionRecorder.isSupported();
  }

  public async startRecording(): Promise<void> {
    if (!this.isReady || !this.limiter) {
      await this.startContext();
    }

    this.ensureSessionRecorder();

    if (!this.sessionRecorder) {
      throw new Error('Session recording is not supported in this browser');
    }

    await this.sessionRecorder.start();
    // Align MIDI timeline with the audio session start (Tone transport clock).
    this.sessionMidiRecorder.start(Tone.now());
    devLog('[AudioEngine] Session recording started');
  }

  /**
   * Finalize audio and MIDI in parallel. encode() flushes any held MIDI notes
   * at endTime (instant panic, not synth ADSR length).
   */
  public async stopRecording(): Promise<{ audio: Blob; midi: Blob }> {
    if (!this.sessionRecorder) {
      throw new Error('Session recorder is not initialized');
    }

    const endTime = Tone.now();
    const [audio, midi] = await Promise.all([
      this.sessionRecorder.stop(),
      this.sessionMidiRecorder.encode(endTime),
    ]);
    devLog('[AudioEngine] Session recording stopped');
    return { audio, midi };
  }

  private noteNamesToMidi(noteNames: string[]): number[] {
    return noteNames.map((note) => Tone.Frequency(note).toMidi());
  }

  /**
   * Ramp the recorder-only tap to silence before stop() to avoid end-of-file clicks.
   */
  public async fadeOutRecordingTap(
    durationMs: number = RECORDING_STOP_FADE_MS,
  ): Promise<void> {
    if (!this.isReady || !this.limiter) {
      await this.startContext();
    }

    this.ensureSessionRecorder();

    if (!this.recordTailGain) {
      return;
    }

    await this.scheduleRecordingTapFade(1, RECORDING_TAP_MIN_GAIN, durationMs);
  }

  private scheduleRecordingTapFade(
    fromGain: number,
    toGain: number,
    durationMs: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      this.clearRecordingFadeTimer();

      const durationSec = durationMs / 1000;
      const now = Tone.now();
      const gainParam = this.recordTailGain!.gain;

      gainParam.cancelScheduledValues(now);
      gainParam.setValueAtTime(fromGain, now);
      gainParam.exponentialRampToValueAtTime(toGain, now + durationSec);

      this.recordingFadeTimer = setTimeout(() => {
        this.recordingFadeTimer = null;
        resolve();
      }, durationMs + RECORDING_FADE_SAFETY_MS);
    });
  }

  /** Restore recorder tap gain after a stop fade. */
  public resetRecordingTailGain(): void {
    this.clearRecordingFadeTimer();

    if (!this.recordTailGain) {
      return;
    }

    const now = Tone.now();
    const gainParam = this.recordTailGain.gain;
    gainParam.cancelScheduledValues(now);
    gainParam.setValueAtTime(1, now);
  }

  private clearRecordingFadeTimer(): void {
    if (this.recordingFadeTimer !== null) {
      clearTimeout(this.recordingFadeTimer);
      this.recordingFadeTimer = null;
    }
  }

  public async startContext() {
    unlockIosMediaChannel();
    await waitForIosMediaChannel();
    await Tone.start();
    if (!this.isReady) {
      await this.initSynth();
    }
  }

  public playNotes(midiNotes: number[], duration: string = "2n") {
    if (!this.synth || !this.isReady) {
      // startContext wasn't called yet — try to initialize
      this.startContext().then(() => this.playNotes(midiNotes, duration));
      return;
    }

    const now = Tone.now();
    // Soft-release any currently sustained notes at the precise current time
    // (uses triggerRelease on specific notes, not releaseAll, to preserve crossfade quality)
    this.releasePreviousNotes(now);

    // Clamp MIDI to piano range (A0=21, C8=108) to avoid Tone.js errors
    const clamped = midiNotes.map(n => Math.max(21, Math.min(108, n)));

    // Convert MIDI → note names (e.g. 60 → "C4")
    const noteNames = clamped.map(n => Tone.Frequency(n, 'midi').toNote());

    devLog('[AudioEngine] Playing notes:', noteNames, '(MIDI:', clamped, ')');

    // Timed preview (borrowing sliders). Track names so the next call can
    // release them even though triggerAttackRelease is not sustained.
    this.activeNotes = noteNames as string[];

    // Add a microscopic 15ms delay to the attack to prevent popping/clicks against the release
    const attackTime = now + 0.015;
    this.synth.triggerAttackRelease(noteNames, duration, attackTime);

    if (this.sessionMidiRecorder.isRecording()) {
      const durationSec = Tone.Time(duration).toSeconds();
      // Mirror triggerAttackRelease timing for DAW-importable note spans.
      this.sessionMidiRecorder.logNoteOns(clamped, undefined, attackTime);
      this.sessionMidiRecorder.logNoteOffs(
        clamped,
        attackTime + durationSec,
      );
    }
  }

  public triggerAttack(midiNotes: number[], retrigger: boolean = false) {
    this.isPointerDown = true;
    if (this.synth && this.isReady) {
      this.triggerAttackSync(midiNotes, retrigger);
    } else {
      // Async initialization path for the first gesture
      this.startContext().then(() => {
        if (this.isPointerDown) {
          this.triggerAttackSync(midiNotes, retrigger);
        } else {
          devLog('[AudioEngine] Pointer was released during async initialization. Aborting attack.');
        }
      });
    }
  }

  private triggerAttackSync(midiNotes: number[], retrigger: boolean = false) {
    if (!this.synth || !this.isReady) return;

    const now = Tone.now();

    // Clamp MIDI to piano range (A0=21, C8=108) to avoid Tone.js errors
    const clamped = midiNotes.map(n => Math.max(21, Math.min(108, n)));
    // Cast to string[] — Tone internally accepts note name strings; the strict union
    // type on toNote() is overly narrow for filter/includes operations.
    const noteNames: string[] = clamped.map(n => Tone.Frequency(n, 'midi').toNote() as string);

    if (retrigger) {
      // Tilt taps: full release + re-attack even when pitches are unchanged
      // so each tap produces clear audible feedback.
      if (this.activeNotes.length > 0) {
        try {
          this.synth.triggerRelease(this.activeNotes, now);
        } catch (err) {
          devWarn('[AudioEngine] Retrigger release error:', err);
        }
        if (this.sessionMidiRecorder.isRecording()) {
          this.sessionMidiRecorder.logNoteOffs(
            this.noteNamesToMidi(this.activeNotes),
            now,
          );
        }
      }
      this.activeNotes = noteNames;
      devLog('[AudioEngine] Retriggering:', noteNames);
      const attackTime = now + 0.015;
      this.synth.triggerAttack(noteNames, attackTime);
      if (this.sessionMidiRecorder.isRecording()) {
        this.sessionMidiRecorder.logNoteOns(clamped, undefined, attackTime);
      }
      return;
    }

    // ── Synchronous Legato Diffing ──────────────────────────────────────────
    // Drone/glissando: sustain overlapping notes, release only what dropped out.
    const notesToRelease = this.activeNotes.filter(n => !noteNames.includes(n));
    const notesToAttack  = noteNames.filter(n => !this.activeNotes.includes(n));

    // Update state synchronously before any audio scheduling
    this.activeNotes = noteNames;

    if (notesToRelease.length > 0) {
      try {
        this.synth.triggerRelease(notesToRelease, now);
      } catch (err) {
        devWarn('[AudioEngine] Transition release error:', err);
      }
      if (this.sessionMidiRecorder.isRecording()) {
        this.sessionMidiRecorder.logNoteOffs(
          this.noteNamesToMidi(notesToRelease),
          now,
        );
      }
    }

    if (notesToAttack.length > 0) {
      devLog('[AudioEngine] Attacking:', notesToAttack, '| Sustaining:', noteNames.filter(n => !notesToAttack.includes(n)), '| Releasing:', notesToRelease);
      // Schedule immediately at `now`. Removing the arbitrary delay prevents
      // chronological inversions from rapid subsequent clicks.
      this.synth.triggerAttack(notesToAttack, now);
      if (this.sessionMidiRecorder.isRecording()) {
        this.sessionMidiRecorder.logNoteOns(
          this.noteNamesToMidi(notesToAttack),
          undefined,
          now,
        );
      }
    }
  }

  /**
   * Explicit pointer-up / hard stop.
   * Uses synth.releaseAll() as a nuclear guarantee — no orphaned notes regardless
   * of what's in activeNotes or what voices the PolySynth has internally allocated.
   */
  public releaseActiveNotes() {
    this.isPointerDown = false;
    if (this.synth && this.isReady) {
      devLog('[AudioEngine] Hard stop — releasing all voices.');
      if (this.sessionMidiRecorder.isRecording()) {
        // Match synth panic: instant MIDI offs, not envelope release length.
        this.sessionMidiRecorder.logAllNotesOff(Tone.now());
      }
      try {
        // Redundancy: release specific tracked notes, then trigger releaseAll
        if (this.activeNotes.length > 0) {
          this.synth.triggerRelease(this.activeNotes, Tone.now());
        }
        this.synth.releaseAll();
      } catch (err) {
        devWarn('[AudioEngine] ReleaseAll error:', err);
      }
      this.activeNotes = [];
    }
  }

  /**
   * Soft release used by playNotes (envelope/preview mode) — releases only the
   * tracked active notes at a precise scheduled time for clean crossfading.
   */
  private releasePreviousNotes(time: number) {
    if (this.synth && this.isReady && this.activeNotes.length > 0) {
      if (this.sessionMidiRecorder.isRecording()) {
        this.sessionMidiRecorder.logNoteOffs(
          this.noteNamesToMidi(this.activeNotes),
          time,
        );
      }
      try {
        this.synth.triggerRelease(this.activeNotes, time);
      } catch (err) {
        devWarn('[AudioEngine] Preview release error:', err);
      }
      this.activeNotes = [];
    }
  }

  public setVolume(db: number) {
    if (this.synth) {
      this.synth.volume.value = db;
    }
  }

  // Real-time control setters
  public setChorusWet(value: number) {
    this.chorusWetVal = value;
    if (this.chorus) {
      this.chorus.wet.value = Math.max(0, Math.min(1, value));
    }
  }

  public setDelayWet(value: number) {
    this.delayWetVal = value;
    if (this.delay) {
      this.delay.wet.value = Math.max(0, Math.min(1, value));
    }
  }

  public setReverbWet(value: number) {
    this.reverbWetVal = value;
    if (this.reverb) {
      this.reverb.wet.value = Math.max(0, Math.min(1, value));
    }
  }

  public setEnvelope(attack: number, decay: number, sustain: number, release: number) {
    this.envelopeAttackVal = attack;
    this.envelopeDecayVal = decay;
    this.envelopeSustainVal = sustain;
    this.envelopeReleaseVal = release;
    if (this.synth) {
      this.synth.set({
        envelope: {
          attack,
          decay,
          sustain,
          release
        }
      });
    }
  }
}

export const audioEngine = new AudioEngine();
