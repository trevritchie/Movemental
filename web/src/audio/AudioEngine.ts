/**
 * PolySynth master bus: filter, harmonic enhance, modulation, EQ, dynamics, and session capture.
 *
 * Signal chain (synth to speakers):
 * PolySynth -> Filter -> [dry + harmonic enhance] -> Chorus -> Delay -> Reverb ->
 * EQ3 -> Compressor -> Limiter -> Destination. SessionRecorder taps Limiter ->
 * recordTailGain.
 */
import * as Tone from 'tone';
import {
  unlockIosMediaChannel,
  waitForIosMediaChannel,
} from './iosMediaChannel';
import { SessionRecorder } from './SessionRecorder';
import { SessionMidiRecorder } from './SessionMidiRecorder';
import {
  DEFAULT_OUTPUT_PROFILE_ID,
  getOutputProfile,
  type OutputProfile,
  type OutputProfileId,
} from './outputProfiles';
import {
  DEFAULT_SYNTH_PRESET_ID,
  getMaxPolyphony,
  getSynthPreset,
  type SynthClassName,
  type SynthPreset,
} from './synthPresets';

/** Final peak limiter ceiling (dB). */
const LIMITER_CEILING_DB = -1.5;
const COMPRESSOR_ATTACK_SEC = 0.03;
const COMPRESSOR_RELEASE_SEC = 0.08;
/** Reverb tail. */
const REVERB_DECAY_SEC = 3.5;
const REVERB_PRE_DELAY_SEC = 0.02;
/** Ping-pong delay (dotted quarter, feedback 0-1). */
const DELAY_TIME = '4n.';
const DELAY_FEEDBACK = 0.25;
/** Chorus LFO and wet mix. */
const CHORUS_LFO_HZ = 1.5;
const CHORUS_DELAY_MS = 3.5;
const CHORUS_DEPTH = 0.7;
/** Post-synth lowpass warmth. */
const FILTER_CUTOFF_HZ = 900;
const FILTER_ROLLOFF_DB = -12;
const SYNTH_VOLUME_DB = -12;
/** Piano MIDI range (A0 through C8). */
const MIDI_NOTE_MIN = 21;
const MIDI_NOTE_MAX = 108;
/** Micro-delay before attack to avoid release/attack clicks. */
const ATTACK_SCHEDULE_OFFSET_SEC = 0.015;

const SYNTH_CLASS_MAP = {
  Synth: Tone.Synth,
  FMSynth: Tone.FMSynth,
  AMSynth: Tone.AMSynth,
  MonoSynth: Tone.MonoSynth,
} as const;

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
  private currentSynthClass: SynthClassName = 'Synth';
  private filter: Tone.Filter | null = null;
  private harmonicHpf: Tone.Filter | null = null;
  private harmonicDistortion: Tone.Distortion | null = null;
  private harmonicDryGain: Tone.Gain | null = null;
  private harmonicWetGain: Tone.Gain | null = null;
  private harmonicMerge: Tone.Gain | null = null;
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

  private outputProfileId: OutputProfileId = DEFAULT_OUTPUT_PROFILE_ID;
  private currentPreset: SynthPreset = getSynthPreset(DEFAULT_SYNTH_PRESET_ID);

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

  private createSynth(preset: SynthPreset): Tone.PolySynth {
    const SynthClass = SYNTH_CLASS_MAP[preset.synthClass];
    const synth = new Tone.PolySynth(
      SynthClass as unknown as typeof Tone.Synth,
      {
        ...preset.voiceOptions,
        envelope: {
          attack: this.envelopeAttackVal,
          decay: this.envelopeDecayVal,
          sustain: this.envelopeSustainVal,
          release: this.envelopeReleaseVal,
        },
        volume: preset.volumeDb ?? SYNTH_VOLUME_DB,
      },
    );
    synth.maxPolyphony = getMaxPolyphony(preset.synthClass);
    this.currentSynthClass = preset.synthClass;
    return synth;
  }

  private applyHarmonicEnhance(profile: OutputProfile): void {
    const { harmonicEnhance } = profile;
    if (this.harmonicHpf) {
      this.harmonicHpf.frequency.value = harmonicEnhance.hpfHz;
    }
    if (this.harmonicDistortion) {
      this.harmonicDistortion.distortion = harmonicEnhance.distortion;
    }
    if (this.harmonicWetGain) {
      this.harmonicWetGain.gain.value = harmonicEnhance.enabled
        ? harmonicEnhance.wet
        : 0;
    }
    if (this.harmonicDryGain) {
      this.harmonicDryGain.gain.value = 1;
    }
  }

  private applyEqProfile(profile: OutputProfile): void {
    if (!this.eq) {
      return;
    }
    const { eq } = profile;
    this.eq.low.value = eq.low;
    this.eq.mid.value = eq.mid;
    this.eq.high.value = eq.high;
    this.eq.lowFrequency.value = eq.lowFrequency;
    this.eq.highFrequency.value = eq.highFrequency;
  }

  private applyCompressorProfile(profile: OutputProfile): void {
    if (!this.compressor) {
      return;
    }
    this.compressor.threshold.value = profile.compressor.threshold;
    this.compressor.ratio.value = profile.compressor.ratio;
  }

  private async initSynth() {
    const profile = getOutputProfile(this.outputProfileId);

    // 8. Limiter - final peak control to guarantee no digital clipping
    this.limiter = new Tone.Limiter(LIMITER_CEILING_DB).toDestination();

    // 7. Compressor - glues the polyphonic voices and smooths out transient spikes
    this.compressor = new Tone.Compressor({
      threshold: profile.compressor.threshold,
      ratio: profile.compressor.ratio,
      attack: COMPRESSOR_ATTACK_SEC,
      release: COMPRESSOR_RELEASE_SEC,
    });
    this.compressor.connect(this.limiter);

    // 6. EQ3 - output translation profile (small speakers or studio reference)
    this.eq = new Tone.EQ3({
      low: profile.eq.low,
      mid: profile.eq.mid,
      high: profile.eq.high,
      lowFrequency: profile.eq.lowFrequency,
      highFrequency: profile.eq.highFrequency,
    });
    this.eq.connect(this.compressor);

    // 5. Reverb - creates a lush, diffuse, expensive space (async generation)
    this.reverb = new Tone.Reverb({
      decay: REVERB_DECAY_SEC,
      wet: this.reverbWetVal,
      preDelay: REVERB_PRE_DELAY_SEC,
    });
    this.reverb.connect(this.eq);
    void this.reverb.generate();

    // 4. Ping-Pong Delay - subtle bouncing ambient delay tail
    this.delay = new Tone.PingPongDelay({
      delayTime: DELAY_TIME,
      feedback: DELAY_FEEDBACK,
      wet: this.delayWetVal,
    });
    this.delay.connect(this.reverb);

    // 3. Chorus - adds high-end shimmer and incredible stereo width
    this.chorus = new Tone.Chorus({
      frequency: CHORUS_LFO_HZ,
      delayTime: CHORUS_DELAY_MS,
      depth: CHORUS_DEPTH,
      wet: this.chorusWetVal,
    });
    this.chorus.connect(this.delay);
    this.chorus.start();

    // 2b. Harmonic enhance parallel path (missing-fundamental aid for small speakers)
    this.harmonicMerge = new Tone.Gain(1);
    this.harmonicMerge.connect(this.chorus);

    this.harmonicDryGain = new Tone.Gain(1);
    this.harmonicWetGain = new Tone.Gain(0);
    this.harmonicHpf = new Tone.Filter({
      type: 'highpass',
      frequency: profile.harmonicEnhance.hpfHz,
      rolloff: -12,
    });
    this.harmonicDistortion = new Tone.Distortion(
      profile.harmonicEnhance.distortion,
    );
    this.harmonicDryGain.connect(this.harmonicMerge);
    this.harmonicHpf.connect(this.harmonicDistortion);
    this.harmonicDistortion.connect(this.harmonicWetGain);
    this.harmonicWetGain.connect(this.harmonicMerge);
    this.applyHarmonicEnhance(profile);

    // 2. Master Lowpass Filter - analog warmth sweep applied to all voices collectively
    this.filter = new Tone.Filter({
      frequency: this.currentPreset.filterCutoffHz ?? FILTER_CUTOFF_HZ,
      type: 'lowpass',
      rolloff: FILTER_ROLLOFF_DB,
    });
    this.filter.connect(this.harmonicDryGain);
    this.filter.connect(this.harmonicHpf);

    // 1. Synthesizer
    this.synth = this.createSynth(this.currentPreset);
    this.synth.connect(this.filter);

    this.ensureSessionRecorder();

    this.isReady = true;
    devLog(
      '[AudioEngine] PolySynth ready:',
      this.currentPreset.name,
      '| Output:',
      profile.label,
    );
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
    const clamped = midiNotes.map(
      (n) => Math.max(MIDI_NOTE_MIN, Math.min(MIDI_NOTE_MAX, n)),
    );

    // Convert MIDI → note names (e.g. 60 → "C4")
    const noteNames = clamped.map(n => Tone.Frequency(n, 'midi').toNote());

    devLog('[AudioEngine] Playing notes:', noteNames, '(MIDI:', clamped, ')');

    // Timed preview (borrowing sliders). Track names so the next call can
    // release them even though triggerAttackRelease is not sustained.
    this.activeNotes = noteNames as string[];

    // Add a microscopic 15ms delay to the attack to prevent popping/clicks against the release
    const attackTime = now + ATTACK_SCHEDULE_OFFSET_SEC;
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
    const clamped = midiNotes.map(
      (n) => Math.max(MIDI_NOTE_MIN, Math.min(MIDI_NOTE_MAX, n)),
    );
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
      const attackTime = now + ATTACK_SCHEDULE_OFFSET_SEC;
      this.synth.triggerAttack(noteNames, attackTime);
      if (this.sessionMidiRecorder.isRecording()) {
        this.sessionMidiRecorder.logNoteOns(clamped, undefined, attackTime);
      }
      return;
    }

    // Synchronous legato diffing: sustain overlaps, release only dropped pitches.
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
      devLog('[AudioEngine] Hard stop. Releasing all voices.');
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

  public setOutputProfile(profile: OutputProfile): void {
    this.outputProfileId = profile.id;
    this.applyEqProfile(profile);
    this.applyHarmonicEnhance(profile);
    this.applyCompressorProfile(profile);
  }

  public getOutputProfileId(): OutputProfileId {
    return this.outputProfileId;
  }

  public applyPreset(preset: SynthPreset): void {
    this.currentPreset = preset;

    if (!this.synth || !this.filter) {
      return;
    }

    this.releaseActiveNotes();

    const needsRecreate = this.currentSynthClass !== preset.synthClass;

    if (needsRecreate) {
      this.synth.disconnect();
      this.synth.dispose();
      this.synth = this.createSynth(preset);
      this.synth.connect(this.filter);
    } else {
      this.synth.set({
        ...preset.voiceOptions,
        volume: preset.volumeDb ?? SYNTH_VOLUME_DB,
      });
      this.setEnvelope(
        this.envelopeAttackVal,
        this.envelopeDecayVal,
        this.envelopeSustainVal,
        this.envelopeReleaseVal,
      );
    }

    if (preset.filterCutoffHz !== undefined) {
      this.filter.frequency.value = preset.filterCutoffHz;
    }
  }

  public getSynthPresetId(): string {
    return this.currentPreset.id;
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
