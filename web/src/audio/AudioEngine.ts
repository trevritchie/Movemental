import * as Tone from 'tone';

export class AudioEngine {
  private synth: Tone.PolySynth | null = null;
  private chorus: Tone.Chorus | null = null;
  private delay: Tone.PingPongDelay | null = null;
  private reverb: Tone.Reverb | null = null;
  private eq: Tone.EQ3 | null = null;
  private compressor: Tone.Compressor | null = null;
  private limiter: Tone.Limiter | null = null;
  private isReady: boolean = false;
  private activeNotes: string[] = [];
  private isPointerDown: boolean = false;

  // Cached effect intensity values (handles settings changed before AudioContext initialization)
  private chorusWetVal: number = 0.35;
  private delayWetVal: number = 0.0;
  private reverbWetVal: number = 0.30;

  constructor() {
    // Initialized on first user gesture via startContext()
  }

  private async initSynth() {
    // Signal chain: PolySynth -> Chorus -> Delay -> Reverb -> EQ3 -> Compressor -> Limiter -> Destination
    
    // 7. Limiter - final peak control to guarantee no digital clipping
    this.limiter = new Tone.Limiter(-1.5).toDestination();

    // 6. Compressor - glues the polyphonic voices and smooths out transient spikes
    this.compressor = new Tone.Compressor({
      threshold: -15,
      ratio: 3.5,
      attack: 0.03,
      release: 0.08,
    });
    this.compressor.connect(this.limiter);

    // 5. EQ3 - Tailored specifically for laptop speaker translation:
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

    // 4. Reverb - creates a lush, diffuse, expensive space (async generation)
    this.reverb = new Tone.Reverb({
      decay: 3.0,
      wet: this.reverbWetVal,
      preDelay: 0.02,
    });
    this.reverb.connect(this.eq);
    await this.reverb.generate();

    // 3. Ping-Pong Delay - subtle bouncing ambient delay tail
    this.delay = new Tone.PingPongDelay({
      delayTime: "4n.", // dotted quarter note for rhythmic interest
      feedback: 0.2,
      wet: this.delayWetVal,
    });
    this.delay.connect(this.reverb);

    // 2. Chorus - adds high-end shimmer and incredible stereo width
    this.chorus = new Tone.Chorus({
      frequency: 1.5,
      delayTime: 3.5,
      depth: 0.7,
      wet: this.chorusWetVal,
    });
    this.chorus.connect(this.delay);
    this.chorus.start(); // Start the LFO for the chorus effect

    // 1. Synthesizer - PolySynth wrapping MonoSynth for independent voice filter sweeps
    this.synth = new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: {
        type: 'fatsawtooth', // unison-style detuned sawtooth waves
        count: 2,            // 2 detuned oscillators per note
        spread: 20,          // wider detune spread to maintain thickness
      },
      filter: {
        Q: 0.8,              // smooth, non-whistling lowpass resonance
        type: 'lowpass',
        rolloff: -12,
      },
      envelope: {
        attack: 0.01,        // extremely snappy attack (10ms)
        decay: 1.2,          // dynamic level decay
        sustain: 0.3,        // lower sustain level for a plucky keyboard feel
        release: 0.4,        // short release (relies on reverb for tail to save CPU)
      },
      filterEnvelope: {
        attack: 0.01,        // extremely snappy filter sweep (10ms)
        decay: 1.0,          // filter cutoff decay time
        sustain: 0.15,       // settles into a warm, muffled tone
        release: 0.4,        // filter closes quickly as amplitude fades
        baseFrequency: 200,  // low default cutoff to ensure fundamental warmth
        octaves: 3.5,        // sweep range of the filter
        exponent: 2,         // musical, non-linear envelope shape
      },
      volume: -4,            // initial volume leveled for the thick unison engine
    });
    this.synth.maxPolyphony = 16;
    this.synth.connect(this.chorus);

    this.isReady = true;
    console.log('[AudioEngine] Premium Subtractive PolySynth (MonoSynth) ready');
  }

  public async startContext() {
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

    console.log('[AudioEngine] Playing notes:', noteNames, '(MIDI:', clamped, ')');

    // Add a microscopic 15ms delay to the attack to prevent popping/clicks against the release
    this.synth.triggerAttackRelease(noteNames, duration, now + 0.015);
  }

  public async triggerAttack(midiNotes: number[]) {
    this.isPointerDown = true;
    if (!this.synth || !this.isReady) {
      await this.startContext();
      if (!this.synth) return;
    }

    // If the user released the mouse while we were asynchronously initializing, abort trigger
    if (!this.isPointerDown) {
      console.log('[AudioEngine] Pointer was released during async initialization. Aborting attack.');
      return;
    }

    const now = Tone.now();

    // Clamp MIDI to piano range (A0=21, C8=108) to avoid Tone.js errors
    const clamped = midiNotes.map(n => Math.max(21, Math.min(108, n)));
    // Cast to string[] — Tone internally accepts note name strings; the strict union
    // type on toNote() is overly narrow for filter/includes operations.
    const noteNames: string[] = clamped.map(n => Tone.Frequency(n, 'midi').toNote() as string);

    // ── Smart legato diffing ──────────────────────────────────────────────────
    // Only release notes that are LEAVING (not in the new chord).
    // Only attack notes that are ARRIVING (not already playing).
    // Notes shared between old and new chord sustain uninterrupted — no click,
    // no re-trigger, no CPU waste from releasing and immediately re-attacking.
    const notesToRelease = this.activeNotes.filter(n => !noteNames.includes(n));
    const notesToAttack  = noteNames.filter(n => !this.activeNotes.includes(n));

    if (notesToRelease.length > 0) {
      try {
        this.synth.triggerRelease(notesToRelease, now);
      } catch (err) {
        console.warn('[AudioEngine] Transition release error:', err);
      }
    }

    // Update the tracked active notes immediately (before scheduling)
    this.activeNotes = noteNames;

    if (notesToAttack.length > 0) {
      console.log('[AudioEngine] Attacking:', notesToAttack, '| Sustaining:', noteNames.filter(n => !notesToAttack.includes(n)), '| Releasing:', notesToRelease);
      // 15ms offset prevents zero-crossing click between release and attack
      this.synth.triggerAttack(notesToAttack, now + 0.015);
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
      console.log('[AudioEngine] Hard stop — releasing all voices.');
      try {
        this.synth.releaseAll();
      } catch (err) {
        console.warn('[AudioEngine] ReleaseAll error:', err);
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
      try {
        this.synth.triggerRelease(this.activeNotes, time);
      } catch (err) {
        console.warn('[AudioEngine] Preview release error:', err);
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
}

export const audioEngine = new AudioEngine();
