import * as Tone from 'tone';

export class AudioEngine {
  private sampler: Tone.Sampler | null = null;
  private isLoaded: boolean = false;
  private activeNotes: string[] = [];

  constructor() {
    this.initSampler();
  }

  private initSampler() {
    this.sampler = new Tone.Sampler({
      urls: {
        A0: "A0.mp3",
        C1: "C1.mp3",
        DS1: "Ds1.mp3",
        FS1: "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        DS2: "Ds2.mp3",
        FS2: "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        DS3: "Ds3.mp3",
        FS3: "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        DS4: "Ds4.mp3",
        FS4: "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        DS5: "Ds5.mp3",
        FS5: "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        DS6: "Ds6.mp3",
        FS6: "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        DS7: "Ds7.mp3",
        FS7: "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3"
      },
      release: 1,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      onload: () => {
        this.isLoaded = true;
      }
    }).toDestination();
    
    // Add some subtle reverb for a more beautiful sound
    const reverb = new Tone.Reverb(2).toDestination();
    this.sampler.connect(reverb);
    this.sampler.volume.value = -5; // slightly lower volume
  }

  public async startContext() {
    await Tone.start();
  }

  public playNotes(midiNotes: number[], duration: string = "2n") {
    if (!this.isLoaded || !this.sampler) return;
    
    // Stop currently playing notes
    if (this.activeNotes.length > 0) {
      this.sampler.triggerRelease(this.activeNotes);
    }
    
    const freqNotes = midiNotes.map(note => Tone.Frequency(note, "midi").toNote());
    this.activeNotes = freqNotes;
    
    this.sampler.triggerAttackRelease(freqNotes, duration);
  }

  public setVolume(db: number) {
    if (this.sampler) {
      this.sampler.volume.value = db;
    }
  }
}

export const audioEngine = new AudioEngine();
