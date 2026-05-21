import * as Tone from 'tone';

export class AudioEngine {
  private synth: Tone.PolySynth | null = null;
  private filter: Tone.Filter | null = null;
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

    this.isReady = true;
    console.log('[AudioEngine] Optimized Premium PolySynth (Synth) & Master Filter ready');
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
