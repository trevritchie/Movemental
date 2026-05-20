import {
  C4, CS4, DF4, D4, EF4, E4, F4, FS4, GF4, G4, GS4, AF4, A4, BF4, B4,
  C5, CF5, CS5, DF5, D5, DS5, EF5, E5, F5, FS5, GF5, G5, GS5, AF5, A5, BF5, B5,
  A3, B3,
  NOTE_NAMES_FLAT,
  VOICING_TO_INDICES,
  OCTAVE
} from './config';

export interface Chord {
  name: string;
  originalPitches: number[];
  pitches: number[];
  traditionalName: string;
  rootPositionIndex: number;
}

export class ChordManager {
  private chords: Map<string, Chord> = new Map();
  private tonalCenterOffset: number = 0;
  private octaveRange: number = 3;
  private voicing: string = "Drop 2 and 4";

  constructor() {
    this.initializeChordDictionary();
  }

  public setTonalCenterOffset(offset: number) {
    this.tonalCenterOffset = offset;
    this.initializeChordDictionary();
  }

  public setOctaveRange(range: number) {
    this.octaveRange = range;
    this.initializeChordDictionary(); // Re-evaluate voicings
  }

  public setVoicing(voicing: string) {
    this.voicing = voicing;
  }

  private createChord(name: string, pitches: number[]): Chord {
    const rootPitchClass = pitches[0] % 12;

    const transposedPitches = pitches.map(p => (p % 12) + (this.tonalCenterOffset % 12));
    
    const chordQualityMap: Record<string, string> = {
      "Earth": " dim7", "Wind": " dim7",
      "-Fire": "7 b5", "Fire": " dim7",
      "Trunk": " min6", "Smoke": " min6", "Magma": " min6",
      "Branch": " maj6", "Ember": " maj6", "Glass": " maj6",
      "Sand-Storm": "7 b5", "Fire-Storm": "7 b5",
      "Leaf": "7", "Flame": "7", "Charcoal": "7"
    };

    let quality = "";
    for (const [suffix, q] of Object.entries(chordQualityMap)) {
      if (name.endsWith(suffix)) {
        quality = q;
        break;
      }
    }

    const rootNote = NOTE_NAMES_FLAT[transposedPitches[0] % 12];
    const traditionalName = rootNote + quality;

    transposedPitches.sort((a, b) => a - b);

    const transposedRootPitchClass = (rootPitchClass + (this.tonalCenterOffset % 12)) % 12;
    let rootPositionIndex = 0;
    for (let i = 0; i < transposedPitches.length; i++) {
      if (transposedPitches[i] % 12 === transposedRootPitchClass) {
        rootPositionIndex = i;
        break;
      }
    }

    return {
      name,
      originalPitches: pitches,
      pitches: transposedPitches,
      traditionalName,
      rootPositionIndex
    };
  }

  public initializeChordDictionary() {
    this.chords.clear();

    const add = (x: number, y: number, name: string, pitches: number[]) => {
      this.chords.set(`${x},${y}`, this.createChord(name, pitches));
    };

    // Elemental Diminished Chords
    add(0.091, 0.158, "Earth", [C4, EF4, FS4, A4]);
    add(0.878, 0.157, "Wind", [DF4, E4, G4, BF4]);
    add(0.471, 0.889, "Fire", [D4, F4, AF4, B4]);

    // Earth-Wind Combinations
    add(0.277, 0.101, "Trunk", [C4, EF4, G4, A4]);
    add(0.238, 0.165, "Brother Trunk", [EF4, GF4, BF4, C5]);
    add(0.280, 0.161, "Twin Trunk", [GF4, A4, DF5, EF5]);
    add(0.317, 0.160, "Sister Trunk", [A3, C4, E4, FS4]);

    add(0.493, 0.042, "Branch", [C4, E4, G4, A4]);
    add(0.442, 0.094, "Brother Branch", [EF4, G4, BF4, C5]);
    add(0.488, 0.094, "Twin Branch", [GF4, BF4, DF5, EF5]);
    add(0.533, 0.094, "Sister Branch", [A3, CS4, E4, FS4]);

    add(0.494, 0.221, "Sand-Storm", [C4, E4, GF4, BF4]);
    add(0.442, 0.282, "Brother Sand-Storm", [EF4, G4, A4, DF5]);
    add(0.499, 0.283, "Twin Sand-Storm", [GF4, BF4, C5, E5]);
    add(0.558, 0.283, "Sister Sand-Storm", [A3, DF4, EF4, G4]);

    add(0.683, 0.113, "Leaf", [C4, E4, G4, BF4]);
    add(0.658, 0.171, "Brother Leaf", [EF4, G4, BF4, DF5]);
    add(0.693, 0.161, "Twin Leaf", [GF4, BF4, DF5, E5]);
    add(0.726, 0.165, "Sister Leaf", [A3, CS4, E4, G4]);

    // Wind-Fire Combinations
    add(0.833, 0.310, "Smoke", [G4, BF4, D5, E5]);
    add(0.785, 0.360, "Brother Smoke", [BF4, DF5, F5, G5]);
    add(0.825, 0.360, "Twin Smoke", [DF5, E5, AF5, BF5]);
    add(0.864, 0.371, "Sister Smoke", [E4, G4, B4, CS5]);

    add(0.929, 0.475, "Ember", [G4, B4, D5, E5]);
    add(0.873, 0.533, "Brother Ember", [BF4, D5, F5, G5]);
    add(0.919, 0.528, "Twin Ember", [DF5, F5, AF5, BF5]);
    add(0.962, 0.532, "Sister Ember", [E4, GS4, B4, CS5]);

    add(0.627, 0.444, "Fire-Storm", [G4, B4, DF5, F5]);
    add(0.561, 0.511, "Brother Fire-Storm", [BF4, D5, E5, AF5]);
    add(0.630, 0.501, "Twin Fire-Storm", [DF5, F5, G5, B5]);
    add(0.686, 0.504, "Sister Fire-Storm", [E4, AF4, BF4, D5]);

    add(0.680, 0.738, "Flame", [G4, B4, D5, F5]);
    add(0.623, 0.794, "Brother Flame", [BF4, D5, F5, AF5]);
    add(0.675, 0.792, "Twin Flame", [DF5, F5, AF5, B5]);
    add(0.728, 0.796, "Sister Flame", [E4, GS4, B4, D5]);

    // Fire-Earth Combinations
    add(0.283, 0.690, "Magma", [D4, F4, A4, B5]);
    add(0.233, 0.754, "Brother Magma", [F4, AF4, C5, D5]);
    add(0.284, 0.754, "Twin Magma", [AF4, CF5, EF5, F5]);
    add(0.328, 0.751, "Sister Magma", [B3, D4, FS4, GS4]);

    add(0.069, 0.468, "Glass", [F4, A4, C5, D5]);
    add(0.028, 0.533, "Brother Glass", [AF4, C4, EF5, F5]);
    add(0.072, 0.528, "Twin Glass", [B4, DS5, FS5, GS5]);
    add(0.109, 0.525, "Sister Glass", [D4, FS4, A4, B5]);

    add(0.392, 0.432, "Forest-Fire", [F4, A4, CF5, EF5]);
    add(0.348, 0.493, "Brother Forest-Fire", [AF4, C5, D5, GF5]);
    add(0.393, 0.487, "Twin Forest-Fire", [CF5, EF5, F5, A5]);
    add(0.438, 0.485, "Sister Forest-Fire", [D4, GF4, AF4, C5]);

    add(0.196, 0.326, "Charcoal", [F4, A4, C5, EF5]);
    add(0.144, 0.381, "Brother Charcoal", [AF4, C4, EF5, GF5]);
    add(0.193, 0.378, "Twin Charcoal", [B4, DS5, FS5, A5]);
    add(0.241, 0.381, "Sister Charcoal", [D4, FS4, A4, C5]);
  }

  public getAllCoordinates(): {x: number, y: number}[] {
    return Array.from(this.chords.keys()).map(k => {
      const [x, y] = k.split(',');
      return { x: parseFloat(x), y: parseFloat(y) };
    });
  }

  public getCoordinateForChord(name: string): {x: number, y: number} | null {
    for (const [key, chord] of this.chords.entries()) {
      if (chord.name === name) {
        const [x, y] = key.split(',');
        return { x: parseFloat(x), y: parseFloat(y) };
      }
    }
    return null;
  }

  public getChordByCoordinates(x: number, y: number): Chord | undefined {
    // Find closest to avoid floating point issues
    let closestDist = Infinity;
    let closestCoord = "";
    
    for (const key of this.chords.keys()) {
      const [cx, cy] = key.split(',').map(parseFloat);
      const dist = Math.hypot(cx - x, cy - y);
      if (dist < closestDist) {
        closestDist = dist;
        closestCoord = key;
      }
    }
    
    if (closestDist < 0.05) { // Threshold
        return this.chords.get(closestCoord);
    }
    return undefined;
  }

  public getChordByName(name: string): Chord | undefined {
    for (const chord of this.chords.values()) {
      if (chord.name === name) return chord;
    }
    return undefined;
  }

  public getElementalChord(elementName: string): Chord | undefined {
    if (["Earth", "Wind", "Fire"].includes(elementName)) {
      return this.getChordByName(elementName);
    }
    return undefined;
  }

  public applyVoicing(pitches: (number | null)[]): number[] {
    const voicedPitches: number[] = [];
    const octaveOffset = OCTAVE * this.octaveRange;
    const indicesToRaise = VOICING_TO_INDICES[this.voicing] || [];

    for (let i = 0; i < pitches.length; i++) {
      if (pitches[i] === null) continue;

      let adjustedPitch = pitches[i]! + octaveOffset;
      if (indicesToRaise.includes(i)) {
        adjustedPitch += OCTAVE;
      }
      voicedPitches.push(adjustedPitch);
    }
    return voicedPitches;
  }
}

export const chordManager = new ChordManager();
