import {
  C4, CS4, DF4, D4, EF4, E4, F4, FS4, GF4, G4, GS4, AF4, A4, BF4, B4,
  C5, CF5, CS5, DF5, D5, DS5, EF5, E5, F5, FS5, GF5, G5, GS5, AF5, A5, BF5, B5,
  A3, B3,
  NOTE_NAMES_FLAT,
  VOICING_TO_INDICES,
  OCTAVE,
  DEFAULT_TONAL_CENTER_OFFSET,
  DEFAULT_OCTAVE_RANGE,
  DEFAULT_VOICING
} from './config';

export interface Chord {
  name: string;
  originalPitches: number[];
  pitches: number[];
  traditionalName: string;
  rootPositionIndex: number;
}

export class ChordManager {
  private chordsByName: Map<string, Chord> = new Map();
  private coordinateList: { x: number; y: number; key: string; chord: Chord }[] = [];
  private chordNameToCoordinate: Map<string, { x: number; y: number }> = new Map();
  private tonalCenterOffset: number = DEFAULT_TONAL_CENTER_OFFSET;
  private octaveRange: number = DEFAULT_OCTAVE_RANGE;
  private voicing: string = DEFAULT_VOICING;

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
    this.chordsByName.clear();
    this.coordinateList = [];
    this.chordNameToCoordinate.clear();

    const add = (x: number, y: number, name: string, pitches: number[]) => {
      const key = `${x.toFixed(4)},${y.toFixed(4)}`;
      const chord = this.createChord(name, pitches);
      this.chordsByName.set(name, chord);
      this.coordinateList.push({ x, y, key, chord });
      this.chordNameToCoordinate.set(name, { x, y });
    };

    // Calculate symmetrical coordinates
    // Downward-pointing triangle: Earth top-left, Wind top-right, Fire bottom-center
    // Widen Earth-Wind axis and shift higher up
    const earthP = { x: 0.08, y: 0.24 }; // top-left
    const windP  = { x: 0.92, y: 0.24 }; // top-right
    const fireP  = { x: 0.50, y: 0.88 }; // bottom-center

    // Elemental Diminished Chords
    add(earthP.x, earthP.y, "Earth", [C4, EF4, FS4, A4]);
    add(windP.x, windP.y, "Wind", [DF4, E4, G4, BF4]);
    add(fireP.x, fireP.y, "Fire", [D4, F4, AF4, B4]);

    const addEdgeGroups = (
      p1: {x:number, y:number},
      p2: {x:number, y:number},
      groups: { base: string, bro: string, twin: string, sis: string, p1: number[], p2: number[], p3: number[], p4: number[] }[],
      macroDAlong: number,
      macroDPerp: number
    ) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const L = Math.hypot(dx, dy);
      const ux = dx / L;
      const uy = dy / L;

      // Outward normal (assuming clockwise p1->p2 around center)
      const vx = uy;
      const vy = -ux;

      const mx = p1.x + dx * 0.5;
      const my = p1.y + dy * 0.5;

      const macroPositions = [
        { x: mx - ux * macroDAlong, y: my - uy * macroDAlong }, // Macro-Left (towards p1)
        { x: mx + vx * macroDPerp,  y: my + vy * macroDPerp  }, // Macro-Out
        { x: mx - vx * macroDPerp,  y: my - vy * macroDPerp  }, // Macro-In
        { x: mx + ux * macroDAlong, y: my + uy * macroDAlong }  // Macro-Right (towards p2)
      ];

      groups.forEach((g, i) => {
        const C = macroPositions[i];

        // Micro-diamond points
        const microD = 0.052; // Larger: more space between the 4 nodes in each cluster

        // Base: Outward
        const baseX = C.x + vx * microD;
        const baseY = C.y + vy * microD;

        // Twin: Inward
        const twinX = C.x - vx * microD;
        const twinY = C.y - vy * microD;

        // Brother: Left (towards p1)
        const broX = C.x - ux * microD;
        const broY = C.y - uy * microD;

        // Sister: Right (towards p2)
        const sisX = C.x + ux * microD;
        const sisY = C.y + uy * microD;

        add(baseX, baseY, g.base, g.p1);
        add(broX, broY, g.bro, g.p2);
        add(twinX, twinY, g.twin, g.p3);
        add(sisX, sisY, g.sis, g.p4);
      });
    };

    // Earth-Wind
    addEdgeGroups(earthP, windP, [
      { base: "Trunk", bro: "Brother Trunk", twin: "Twin Trunk", sis: "Sister Trunk", p1: [C4, EF4, G4, A4], p2: [EF4, GF4, BF4, C5], p3: [GF4, A4, DF5, EF5], p4: [A3, C4, E4, FS4] },
      { base: "Branch", bro: "Brother Branch", twin: "Twin Branch", sis: "Sister Branch", p1: [C4, E4, G4, A4], p2: [EF4, G4, BF4, C5], p3: [GF4, BF4, DF5, EF5], p4: [A3, CS4, E4, FS4] },
      { base: "Sand-Storm", bro: "Brother Sand-Storm", twin: "Twin Sand-Storm", sis: "Sister Sand-Storm", p1: [C4, E4, GF4, BF4], p2: [EF4, G4, A4, DF5], p3: [GF4, BF4, C5, E5], p4: [A3, DF4, EF4, G4] },
      { base: "Leaf", bro: "Brother Leaf", twin: "Twin Leaf", sis: "Sister Leaf", p1: [C4, E4, G4, BF4], p2: [EF4, G4, BF4, DF5], p3: [GF4, BF4, DF5, E5], p4: [A3, CS4, E4, G4] }
    ], 0.22, 0.11);

    // Wind-Fire
    addEdgeGroups(windP, fireP, [
      { base: "Smoke", bro: "Brother Smoke", twin: "Twin Smoke", sis: "Sister Smoke", p1: [G4, BF4, D5, E5], p2: [BF4, DF5, F5, G5], p3: [DF5, E5, AF5, BF5], p4: [E4, G4, B4, CS5] },
      { base: "Ember", bro: "Brother Ember", twin: "Twin Ember", sis: "Sister Ember", p1: [G4, B4, D5, E5], p2: [BF4, D5, F5, G5], p3: [DF5, F5, AF5, BF5], p4: [E4, GS4, B4, CS5] },
      { base: "Fire-Storm", bro: "Brother Fire-Storm", twin: "Twin Fire-Storm", sis: "Sister Fire-Storm", p1: [G4, B4, DF5, F5], p2: [BF4, D5, E5, AF5], p3: [DF5, F5, G5, B5], p4: [E4, AF4, BF4, D5] },
      { base: "Flame", bro: "Brother Flame", twin: "Twin Flame", sis: "Sister Flame", p1: [G4, B4, D5, F5], p2: [BF4, D5, F5, AF5], p3: [DF5, F5, AF5, B5], p4: [E4, GS4, B4, D5] }
    ], 0.20, 0.11);

    // Fire-Earth
    addEdgeGroups(fireP, earthP, [
      { base: "Magma", bro: "Brother Magma", twin: "Twin Magma", sis: "Sister Magma", p1: [D4, F4, A4, B5], p2: [F4, AF4, C5, D5], p3: [AF4, CF5, EF5, F5], p4: [B3, D4, FS4, GS4] },
      { base: "Glass", bro: "Brother Glass", twin: "Twin Glass", sis: "Sister Glass", p1: [F4, A4, C5, D5], p2: [AF4, C4, EF5, F5], p3: [B4, DS5, FS5, GS5], p4: [D4, FS4, A4, B5] },
      { base: "Forest-Fire", bro: "Brother Forest-Fire", twin: "Twin Forest-Fire", sis: "Sister Forest-Fire", p1: [F4, A4, CF5, EF5], p2: [AF4, C5, D5, GF5], p3: [CF5, EF5, F5, A5], p4: [D4, GF4, AF4, C5] },
      { base: "Charcoal", bro: "Brother Charcoal", twin: "Twin Charcoal", sis: "Sister Charcoal", p1: [F4, A4, C5, EF5], p2: [AF4, C4, EF5, GF5], p3: [B4, DS5, FS5, A5], p4: [D4, FS4, A4, C5] }
    ], 0.20, 0.11);
  }

  public getAllCoordinates(): {x: number, y: number}[] {
    return this.coordinateList.map(c => ({ x: c.x, y: c.y }));
  }

  public getCoordinateForChord(name: string): {x: number, y: number} | null {
    return this.chordNameToCoordinate.get(name) || null;
  }

  public getChordByCoordinates(x: number, y: number): Chord | undefined {
    let closestDistSq = Infinity;
    let closestChord: Chord | undefined = undefined;

    for (let i = 0; i < this.coordinateList.length; i++) {
      const coord = this.coordinateList[i];
      const dx = coord.x - x;
      const dy = coord.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestChord = coord.chord;
      }
    }

    // 0.05 squared is 0.0025
    if (closestDistSq < 0.0025) {
      return closestChord;
    }
    return undefined;
  }

  public getChordByName(name: string): Chord | undefined {
    return this.chordsByName.get(name);
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
