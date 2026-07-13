/**
 * PolySynth master bus: filter, harmonic enhance, modulation, EQ, dynamics, and session capture.
 *
 * Signal chain (synth to speakers):
 * PolySynth -> Filter -> BusHeadroom -> [dry + harmonic enhance] -> FxSend ->
 * Chorus -> Delay -> Reverb -> EQ3 -> Compressor -> MasterMakeup -> Limiter ->
 * Destination. SessionRecorder taps Limiter -> recordTailGain.
 */
import * as Tone from 'tone';
import {
  unlockIosMediaChannel,
  waitForIosMediaChannel,
  pauseIosMediaChannel,
  resumeIosMediaChannel,
  ensurePlaybackAudioSession,
} from './iosMediaChannel';
import { SessionRecorder } from './SessionRecorder';
import { SessionMidiRecorder } from './SessionMidiRecorder';
import { resolveLayoutTierSafe } from '../layout/breakpoints';
import {
  getAdaptedOutputProfile,
  getEffectiveSynthVolumeDb,
  resolveDefaultEqProfileId,
  type OutputProfile,
  type EqProfileId,
} from './outputProfiles';
import {
  ATTACK_SCHEDULE_OFFSET_SEC,
  LIMITER_REDUCTION_WARN_DB,
} from './busConstants';
import {
  buildMasterBusGraph,
  type MasterBusGraph,
} from './masterBusGraph';
import {
  DEFAULT_SYNTH_PRESET_ID,
  getMaxPolyphony,
  getPresetClickHoldEnvelope,
  getSynthPreset,
  isSamplerPreset,
  voiceOptionsWithoutEnvelope,
  type InstrumentEngine,
  type PresetEnvelopeSettings,
  type SynthClassName,
  type SynthPreset,
} from './synthPresets';
import { resolveSampleBaseUrl } from './samplePaths';
import {
  applyProductionLatencyForTier,
  readContextLatencyReport,
} from './latencyRunner';
import { audioDebugLog, isAudioEngineDebugEnabled } from './audioDebug';

/** PolySynth or sample-based Sampler; shared note trigger API. */
type InstrumentVoice = Tone.PolySynth | Tone.Sampler;

/** Piano MIDI range (A0 through C8). */
const MIDI_NOTE_MIN = 21;
const MIDI_NOTE_MAX = 108;

/**
 * Maximum number of sampler presets kept decoded in memory simultaneously.
 * Each sampler holds all sample PCM buffers for one instrument pack.
 * Exceeding this limit evicts the least-recently-loaded entry.
 */
const MAX_SAMPLER_CACHE_SIZE = 4;

/** Cached Tone note names for the piano MIDI range (hot-path attacks). */
const MIDI_NOTE_NAME_CACHE: string[] = (() => {
  const names: string[] = [];
  for (let midi = MIDI_NOTE_MIN; midi <= MIDI_NOTE_MAX; midi += 1) {
    names[midi] = Tone.Frequency(midi, 'midi').toNote() as string;
  }
  return names;
})();

function midiToNoteName(midi: number): string {
  const clamped = Math.max(MIDI_NOTE_MIN, Math.min(MIDI_NOTE_MAX, midi));
  return MIDI_NOTE_NAME_CACHE[clamped]!;
}

const SYNTH_CLASS_MAP = {
  Synth: Tone.Synth,
  FMSynth: Tone.FMSynth,
  AMSynth: Tone.AMSynth,
  MonoSynth: Tone.MonoSynth,
} as const;

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
  private voice: InstrumentVoice | null = null;
  private voiceEngine: InstrumentEngine = 'synth';
  private currentSynthClass: SynthClassName = 'Synth';
  /**
   * Loaded sampler instances keyed by preset id. Insertion order tracks
   * recency (Map preserves insertion order). Capped at MAX_SAMPLER_CACHE_SIZE
   * entries to bound decoded-PCM memory; the oldest entry is disposed on eviction.
   */
  private samplerCache = new Map<string, Tone.Sampler>();
  private presetLoadPromise: Promise<void> | null = null;
  private presetLoadGeneration = 0;
  private bus: MasterBusGraph | null = null;
  private filter: Tone.Filter | null = null;
  private chorus: Tone.Chorus | null = null;
  private delay: Tone.PingPongDelay | null = null;
  private reverb: Tone.Reverb | null = null;
  private masterMakeup: Tone.Gain | null = null;
  private peakMeter: Tone.Meter | null = null;
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

  private eqProfileId: EqProfileId;
  private activeOutputProfile: OutputProfile;
  private currentPreset: SynthPreset = getSynthPreset(DEFAULT_SYNTH_PRESET_ID);

  // Cached effect intensity values (handles settings changed before AudioContext initialization)
  private chorusWetVal: number = 0.35;
  private delayWetVal: number = 0.0;
  private reverbWetVal: number = 0.30;

  // Cached envelope settings
  private envelopeAttackVal: number = 0.15;
  private envelopeDecayVal: number = 2.0;
  private envelopeSustainVal: number = 0.5;
  private envelopeReleaseVal: number = 2.5;
  private envelopeCurveOpts: Partial<
    Pick<
      PresetEnvelopeSettings,
      'attackCurve' | 'decayCurve' | 'sustainCurve' | 'releaseCurve'
    >
  > = {};
  /** When true, sampler uses preset-native release instead of user ADSR (drone mode). */
  private samplerNaturalEnvelope = false;
  private latencyContextConfigured = false;
  private isBackgrounded = false;
  private releaseListeners = new Set<() => void>();
  /** In-flight startContext promise; shared across concurrent callers to prevent double-init. */
  private startContextPromise: Promise<void> | null = null;

  constructor() {
    const tier = resolveLayoutTierSafe();
    this.eqProfileId = resolveDefaultEqProfileId(tier);
    this.activeOutputProfile = getAdaptedOutputProfile(
      this.eqProfileId,
      tier,
    );
    // Initialized on first user gesture via startContext()
  }

  private getEnvelopePayload(): Record<string, unknown> {
    return {
      attack: this.envelopeAttackVal,
      decay: this.envelopeDecayVal,
      sustain: this.envelopeSustainVal,
      release: this.envelopeReleaseVal,
      ...this.envelopeCurveOpts,
    };
  }

  private getSamplerNaturalRelease(): number {
    return this.currentPreset.sampler?.release ?? this.envelopeReleaseVal;
  }

  private getSamplerEnvelopePayload(): {
    attack: number;
    release: number;
  } {
    if (this.samplerNaturalEnvelope) {
      return {
        attack: 0.001,
        release: this.getSamplerNaturalRelease(),
      };
    }

    return {
      attack: this.envelopeAttackVal,
      release: this.envelopeReleaseVal,
    };
  }

  private syncEnvelopeToVoice(): void {
    if (!this.voice) {
      return;
    }

    if (this.voiceEngine === 'sampler') {
      this.voice.set(this.getSamplerEnvelopePayload());
      return;
    }

    (this.voice as Tone.PolySynth).set({
      envelope: this.getEnvelopePayload(),
    });
  }

  private createSynth(preset: SynthPreset): Tone.PolySynth {
    const profile = this.activeOutputProfile;
    const synthClass = preset.synthClass ?? 'Synth';
    const SynthClass = SYNTH_CLASS_MAP[synthClass];
    const synth = new Tone.PolySynth(
      SynthClass as unknown as typeof Tone.Synth,
      {
        ...voiceOptionsWithoutEnvelope(preset.voiceOptions ?? {}),
        envelope: this.getEnvelopePayload(),
        volume: getEffectiveSynthVolumeDb(preset, profile),
      },
    );
    synth.maxPolyphony = getMaxPolyphony(synthClass);
    this.currentSynthClass = synthClass;
    this.voiceEngine = 'synth';
    return synth;
  }

  private loadSampler(preset: SynthPreset): Promise<Tone.Sampler> {
    const cached = this.samplerCache.get(preset.id);
    if (cached) {
      cached.volume.value = getEffectiveSynthVolumeDb(
        preset,
        this.activeOutputProfile,
      );
      cached.set(this.getSamplerEnvelopePayload());
      // Refresh insertion order so this entry is least-likely to be evicted.
      this.samplerCache.delete(preset.id);
      this.samplerCache.set(preset.id, cached);
      return Promise.resolve(cached);
    }

    const samplerConfig = preset.sampler;
    if (!samplerConfig) {
      return Promise.reject(
        new Error(`Sampler preset "${preset.id}" is missing sample map`),
      );
    }

    return new Promise((resolve, reject) => {
      const envelope = this.getSamplerEnvelopePayload();
      const sampler = new Tone.Sampler({
        urls: samplerConfig.urls,
        baseUrl: resolveSampleBaseUrl(samplerConfig.baseUrl),
        attack: envelope.attack,
        release: envelope.release,
        volume: getEffectiveSynthVolumeDb(preset, this.activeOutputProfile),
        onload: () => {
          this.samplerCache.set(preset.id, sampler);
          this.pruneSamplerCache(preset.id);
          resolve(sampler);
        },
        onerror: (error) => {
          reject(error);
        },
      });
    });
  }

  private disposeVoice(voice: InstrumentVoice, engine: InstrumentEngine): void {
    voice.disconnect();
    if (engine === 'sampler') {
      return;
    }
    if (engine === 'synth') {
      (voice as Tone.PolySynth).dispose();
    }
  }

  /**
   * Evict the oldest sampler cache entry (by insertion order) when the cache
   * exceeds MAX_SAMPLER_CACHE_SIZE. The active preset is never evicted.
   */
  private pruneSamplerCache(activePresetId: string): void {
    if (this.samplerCache.size <= MAX_SAMPLER_CACHE_SIZE) {
      return;
    }
    for (const [id, sampler] of this.samplerCache) {
      if (id !== activePresetId) {
        sampler.disconnect();
        sampler.dispose();
        this.samplerCache.delete(id);
        audioDebugLog('[AudioEngine] Sampler cache evicted:', id);
        if (this.samplerCache.size <= MAX_SAMPLER_CACHE_SIZE) {
          break;
        }
      }
    }
  }

  private voiceIsReady(): boolean {
    return Boolean(this.voice && this.isReady && !this.presetLoadPromise);
  }

  private getVoice(): InstrumentVoice | null {
    return this.voiceIsReady() ? this.voice : null;
  }

  public isPresetLoading(): boolean {
    return this.presetLoadPromise !== null;
  }

  public waitForPresetLoad(): Promise<void> {
    return this.presetLoadPromise ?? Promise.resolve();
  }

  private applyHarmonicEnhance(profile: OutputProfile): void {
    this.bus?.applyHarmonicEnhance(profile, this.currentPreset);
  }

  private applyEqProfile(profile: OutputProfile): void {
    this.bus?.applyEqProfile(profile);
  }

  private applyLoudnessProfile(profile: OutputProfile): void {
    this.bus?.applyLoudnessProfile(profile, this.currentPreset);
  }

  private logPeakLevelIfDev(): void {
    if (!isAudioEngineDebugEnabled() || !this.peakMeter) {
      return;
    }
    window.setTimeout(() => {
      const reading = this.peakMeter?.getValue();
      const peakDb = Array.isArray(reading)
        ? Math.max(...reading)
        : (reading ?? -Infinity);
      if (Number.isFinite(peakDb)) {
        audioDebugLog('[AudioEngine] Post-makeup peak (dB):', peakDb.toFixed(1));
      }

      const reduction = this.limiter?.reduction ?? 0;
      if (Number.isFinite(reduction)) {
        audioDebugLog('[AudioEngine] Limiter reduction (dB):', reduction.toFixed(1));
        if (reduction < LIMITER_REDUCTION_WARN_DB) {
          console.warn(
            '[AudioEngine] Limiter working hard (',
            reduction.toFixed(1),
            'dB GR). Check gain staging.',
          );
        }
      }
    }, 80);
  }

  private async initSynth() {
    const profile = this.activeOutputProfile;
    const envelope = getPresetClickHoldEnvelope(this.currentPreset);

    if (isAudioEngineDebugEnabled()) {
      this.peakMeter = new Tone.Meter({ smoothing: 0.3 });
    }

    const bus = await buildMasterBusGraph({
      profile,
      preset: this.currentPreset,
      envelope,
      chorusWet: this.chorusWetVal,
      delayWet: this.delayWetVal,
      reverbWet: this.reverbWetVal,
    });

    this.bus = bus;
    this.voice = bus.voice;
    this.voiceEngine = bus.voiceEngine;
    this.currentSynthClass = bus.voiceClass;
    this.filter = bus.filter;
    this.chorus = bus.chorus;
    this.delay = bus.delay;
    this.reverb = bus.reverb;
    this.masterMakeup = bus.masterMakeup;
    this.limiter = bus.limiter;

    if (this.peakMeter) {
      this.masterMakeup.connect(this.peakMeter);
    }

    this.ensureSessionRecorder();

    this.isReady = true;
    audioDebugLog(
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
    audioDebugLog('[AudioEngine] Session recorder attached via record tail gain');
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
    audioDebugLog('[AudioEngine] Session recording started');
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
    audioDebugLog('[AudioEngine] Session recording stopped');
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

  public registerReleaseListener(listener: () => void): () => void {
    this.releaseListeners.add(listener);
    return () => {
      this.releaseListeners.delete(listener);
    };
  }

  private notifyReleaseListeners(): void {
    for (const listener of this.releaseListeners) {
      listener();
    }
  }

  private cancelScheduledAudio(): void {
    const now = Tone.now();
    Tone.getTransport().cancel(now);

    if (this.masterMakeup) {
      this.masterMakeup.gain.cancelScheduledValues(now);
    }
    if (this.recordTailGain) {
      this.recordTailGain.gain.cancelScheduledValues(now);
    }
  }

  /** True while the page is hidden and background teardown is active. */
  public isPageBackgrounded(): boolean {
    return this.isBackgrounded;
  }

  /**
   * Stop live audio and release the iOS media session when the page is hidden.
   */
  public handlePageBackground(): void {
    if (this.isBackgrounded) return;
    this.isBackgrounded = true;

    this.releaseActiveNotes();
    pauseIosMediaChannel();
  }

  /**
   * Reclaim the playback audio session and resume the Web Audio context when
   * the page becomes visible again. Does not re-trigger sustained chords.
   */
  public async handlePageForeground(): Promise<void> {
    if (!this.isBackgrounded) return;
    this.isBackgrounded = false;

    ensurePlaybackAudioSession();
    await resumeIosMediaChannel();

    try {
      await Tone.start();
    } catch {
      // Some iOS builds require a fresh user gesture to resume.
    }
  }

  public startContext(): Promise<void> {
    if (!this.startContextPromise) {
      this.startContextPromise = this.startContextImpl().finally(() => {
        this.startContextPromise = null;
      });
    }
    return this.startContextPromise;
  }

  private async startContextImpl(): Promise<void> {
    unlockIosMediaChannel();
    await waitForIosMediaChannel();

    if (!this.latencyContextConfigured) {
      const tier = resolveLayoutTierSafe();
      const toneContext = applyProductionLatencyForTier(tier);
      this.latencyContextConfigured = true;
      if (isAudioEngineDebugEnabled()) {
        const report = readContextLatencyReport(toneContext);
        audioDebugLog(
          '[AudioEngine] Latency profile:',
          tier,
          '| lookAhead',
          report.lookAheadSec,
          's | reported',
          report.totalReportedMs.toFixed(1),
          'ms',
        );
      }
    }

    await Tone.start();
    if (!this.isReady) {
      await this.initSynth();
    }
  }

  public playNotes(midiNotes: number[], duration: string = "2n") {
    const voice = this.getVoice();
    if (!voice) {
      this.startContext().then(
        () => { this.playNotes(midiNotes, duration); },
        (err: unknown) => { devWarn('[AudioEngine] playNotes: context init failed, note dropped:', err); }
      );
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
    const noteNames = clamped.map(midiToNoteName);

    audioDebugLog('[AudioEngine] Playing notes:', noteNames, '(MIDI:', clamped, ')');

    // Timed preview (borrowing sliders). Track names so the next call can
    // release them even though triggerAttackRelease is not sustained.
    this.activeNotes = noteNames as string[];

    // Add a microscopic 15ms delay to the attack to prevent popping/clicks against the release
    const attackTime = now + ATTACK_SCHEDULE_OFFSET_SEC;
    voice.triggerAttackRelease(noteNames, duration, attackTime);
    this.logPeakLevelIfDev();

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
    const voice = this.getVoice();
    if (voice) {
      this.triggerAttackSync(midiNotes, retrigger);
    } else {
      // Async initialization path for the first gesture
      this.startContext().then(async () => {
        await this.waitForPresetLoad();
        if (this.isPointerDown) {
          this.triggerAttackSync(midiNotes, retrigger);
        } else {
          audioDebugLog('[AudioEngine] Pointer was released during async initialization. Aborting attack.');
        }
      });
    }
  }

  private triggerAttackSync(midiNotes: number[], retrigger: boolean = false) {
    const voice = this.getVoice();
    if (!voice) return;

    const now = Tone.now();

    // Clamp MIDI to piano range (A0=21, C8=108) to avoid Tone.js errors
    const clamped = midiNotes.map(
      (n) => Math.max(MIDI_NOTE_MIN, Math.min(MIDI_NOTE_MAX, n)),
    );
    // Cast to string[] — Tone internally accepts note name strings; the strict union
    // type on toNote() is overly narrow for filter/includes operations.
    const noteNames: string[] = clamped.map(midiToNoteName);

    if (retrigger) {
      // Tilt taps: full release + re-attack even when pitches are unchanged
      // so each tap produces clear audible feedback.
      if (this.activeNotes.length > 0) {
        try {
          voice.triggerRelease(this.activeNotes, now);
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
      audioDebugLog('[AudioEngine] Retriggering:', noteNames);
      const attackTime = now + ATTACK_SCHEDULE_OFFSET_SEC;
      voice.triggerAttack(noteNames, attackTime);
      this.logPeakLevelIfDev();
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
        voice.triggerRelease(notesToRelease, now);
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
      audioDebugLog('[AudioEngine] Attacking:', notesToAttack, '| Sustaining:', noteNames.filter(n => !notesToAttack.includes(n)), '| Releasing:', notesToRelease);
      // Schedule immediately at `now`. Removing the arbitrary delay prevents
      // chronological inversions from rapid subsequent clicks.
      voice.triggerAttack(notesToAttack, now);
      this.logPeakLevelIfDev();
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
    const voice = this.getVoice();
    if (voice) {
      audioDebugLog('[AudioEngine] Hard stop. Releasing all voices.');
      if (this.sessionMidiRecorder.isRecording()) {
        // Match synth panic: instant MIDI offs, not envelope release length.
        this.sessionMidiRecorder.logAllNotesOff(Tone.now());
      }
      try {
        // Redundancy: release specific tracked notes, then trigger releaseAll
        if (this.activeNotes.length > 0) {
          voice.triggerRelease(this.activeNotes, Tone.now());
        }
        voice.releaseAll();
      } catch (err) {
        devWarn('[AudioEngine] ReleaseAll error:', err);
      }
      this.activeNotes = [];
      this.cancelScheduledAudio();
    }
    this.notifyReleaseListeners();
  }

  /**
   * Soft release used by playNotes (envelope/preview mode) — releases only the
   * tracked active notes at a precise scheduled time for clean crossfading.
   */
  private releasePreviousNotes(time: number) {
    const voice = this.getVoice();
    if (voice && this.activeNotes.length > 0) {
      if (this.sessionMidiRecorder.isRecording()) {
        this.sessionMidiRecorder.logNoteOffs(
          this.noteNamesToMidi(this.activeNotes),
          time,
        );
      }
      try {
        voice.triggerRelease(this.activeNotes, time);
      } catch (err) {
        devWarn('[AudioEngine] Preview release error:', err);
      }
      this.activeNotes = [];
    }
  }

  public setVolume(db: number) {
    if (this.voice) {
      this.voice.volume.value = db;
    }
  }

  public setOutputProfile(profile: OutputProfile): void {
    this.eqProfileId = profile.id;
    this.activeOutputProfile = profile;
    this.applyEqProfile(profile);
    this.applyHarmonicEnhance(profile);
    this.applyLoudnessProfile(profile);
  }

  public getEqProfileId(): EqProfileId {
    return this.eqProfileId;
  }

  /** @deprecated Use getEqProfileId */
  public getOutputProfileId(): EqProfileId {
    return this.eqProfileId;
  }

  public async applyPreset(preset: SynthPreset): Promise<void> {
    if (!this.voice || !this.filter) {
      this.currentPreset = preset;
      return;
    }

    this.releaseActiveNotes();

    const previousPreset = this.currentPreset;
    this.currentPreset = preset;

    const loadGeneration = ++this.presetLoadGeneration;
    const previousVoice = this.voice;
    const previousEngine = this.voiceEngine;

    const needsRecreate =
      preset.engine !== this.voiceEngine ||
      (preset.engine === 'synth' &&
        preset.synthClass !== this.currentSynthClass) ||
      (isSamplerPreset(preset) &&
        isSamplerPreset(previousPreset) &&
        preset.id !== previousPreset.id);

    if (needsRecreate) {
      if (isSamplerPreset(preset)) {
        const loadPromise = this.loadSampler(preset);
        this.presetLoadPromise = loadPromise.then(() => undefined);
        try {
          const sampler = await loadPromise;
          if (loadGeneration !== this.presetLoadGeneration) {
            return;
          }
          this.disposeVoice(previousVoice, previousEngine);
          this.voice = sampler;
          this.voiceEngine = 'sampler';
          sampler.connect(this.filter);
        } catch (err) {
          this.currentPreset = previousPreset;
          devWarn('[AudioEngine] Sampler load failed:', err);
          throw err;
        } finally {
          if (loadGeneration === this.presetLoadGeneration) {
            this.presetLoadPromise = null;
          }
        }
      } else {
        this.disposeVoice(previousVoice, previousEngine);
        this.voice = this.createSynth(preset);
        this.voice.connect(this.filter);
        this.presetLoadPromise = null;
      }
    } else if (preset.engine === 'synth') {
      (this.voice as Tone.PolySynth).set({
        ...voiceOptionsWithoutEnvelope(preset.voiceOptions ?? {}),
        volume: getEffectiveSynthVolumeDb(preset, this.activeOutputProfile),
      });
      this.syncEnvelopeToVoice();
    } else {
      this.voice.volume.value = getEffectiveSynthVolumeDb(
        preset,
        this.activeOutputProfile,
      );
      this.syncEnvelopeToVoice();
    }

    if (preset.filterCutoffHz !== undefined) {
      this.filter.frequency.value = preset.filterCutoffHz;
    }

    this.applyHarmonicEnhance(this.activeOutputProfile);
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

  public setSamplerNaturalEnvelope(enabled: boolean): void {
    if (this.samplerNaturalEnvelope === enabled) {
      return;
    }
    this.samplerNaturalEnvelope = enabled;
    this.syncEnvelopeToVoice();
  }

  public applyEnvelopeSettings(settings: PresetEnvelopeSettings): void {
    this.envelopeAttackVal = settings.attack;
    this.envelopeDecayVal = settings.decay;
    this.envelopeSustainVal = settings.sustain;
    this.envelopeReleaseVal = settings.release;

    this.envelopeCurveOpts = {};
    if (settings.attackCurve !== undefined) {
      this.envelopeCurveOpts.attackCurve = settings.attackCurve;
    }
    if (settings.decayCurve !== undefined) {
      this.envelopeCurveOpts.decayCurve = settings.decayCurve;
    }
    if (settings.sustainCurve !== undefined) {
      this.envelopeCurveOpts.sustainCurve = settings.sustainCurve;
    }
    if (settings.releaseCurve !== undefined) {
      this.envelopeCurveOpts.releaseCurve = settings.releaseCurve;
    }

    this.syncEnvelopeToVoice();
  }

  public setEnvelope(attack: number, decay: number, sustain: number, release: number) {
    this.envelopeAttackVal = attack;
    this.envelopeDecayVal = decay;
    this.envelopeSustainVal = sustain;
    this.envelopeReleaseVal = release;
    this.syncEnvelopeToVoice();
  }
}

export const audioEngine = new AudioEngine();
