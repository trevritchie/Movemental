import * as Tone from 'tone';
import { pickRecordingMimeType } from './recordingMimeTypes';

/**
 * Wraps Tone.Recorder with MIME probing and safe restart after each take.
 */
export class SessionRecorder {
  private recorder: Tone.Recorder | null = null;
  private readonly mimeType: string;
  private sourceConnected = false;
  private source: Tone.ToneAudioNode | null = null;

  private constructor(mimeType: string) {
    this.mimeType = mimeType;
  }

  static isSupported(): boolean {
    if (!Tone.Recorder.supported) {
      return false;
    }
    return pickRecordingMimeType() !== null;
  }

  static create(): SessionRecorder | null {
    const mimeType = pickRecordingMimeType();
    if (!mimeType) {
      return null;
    }
    return new SessionRecorder(mimeType);
  }

  getMimeType(): string {
    return this.recorder?.mimeType ?? this.mimeType;
  }

  /**
   * Parallel tap from the master bus into the recorder input.
   */
  attachSource(source: Tone.ToneAudioNode): void {
    this.source = source;
    this.ensureRecorder();
    if (!this.sourceConnected && this.recorder) {
      source.connect(this.recorder);
      this.sourceConnected = true;
    }
  }

  async start(): Promise<void> {
    this.ensureRecorder();
    if (!this.recorder) {
      throw new Error('SessionRecorder is not available');
    }
    if (this.recorder.state === 'started') {
      return;
    }
    await this.recorder.start();
  }

  async stop(): Promise<Blob> {
    if (!this.recorder || this.recorder.state === 'stopped') {
      throw new Error('SessionRecorder is not recording');
    }

    const blob = await this.recorder.stop();
    this.disposeRecorder();
    this.ensureRecorder();
    return blob;
  }

  dispose(): void {
    this.disposeRecorder();
    this.source = null;
    this.sourceConnected = false;
  }

  private ensureRecorder(): void {
    if (this.recorder) {
      return;
    }

    this.recorder = new Tone.Recorder({ mimeType: this.mimeType });

    if (this.source && !this.sourceConnected) {
      this.source.connect(this.recorder);
      this.sourceConnected = true;
    }
  }

  private disposeRecorder(): void {
    if (!this.recorder) {
      return;
    }

    try {
      this.recorder.dispose();
    } catch {
      // Ignore dispose errors during teardown.
    }

    this.recorder = null;
    this.sourceConnected = false;
  }
}
