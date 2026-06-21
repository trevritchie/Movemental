import { chordManager, type Chord } from './ChordManager';
import { ELEMENTAL_RELATIONSHIPS, NOTE_POSITION_MAPPING } from './config';

export type BorrowingDirection = 'up' | 'down' | null;
export type NoteState = 'on' | 'off';

export interface BorrowingState {
  active: boolean;
  chordName: string | null;
  circlePositions: Record<number, 'line' | 'up' | 'down'>;
  borrowingDirections: Record<number, BorrowingDirection>;
  noteStates: Record<number, NoteState>;
}

export const getInitialBorrowingState = (): BorrowingState => ({
  active: false,
  chordName: null,
  circlePositions: { 1: 'line', 2: 'line', 3: 'line', 4: 'line' },
  borrowingDirections: { 1: null, 2: null, 3: null, 4: null },
  noteStates: { 1: 'on', 2: 'on', 3: 'on', 4: 'on' }
});

const pitchClass = (pitch: number): number => ((pitch % 12) + 12) % 12;

const clampMidi = (pitch: number): number => Math.max(21, Math.min(108, pitch));

/** Nearest MIDI note matching targetPc to referenceMidi. */
export function closestMidiWithPitchClass(
  referenceMidi: number,
  targetPc: number
): number {
  const pc = pitchClass(targetPc);
  const center = Math.round((referenceMidi - pc) / 12);
  let best = clampMidi(pc + 12 * center);
  let bestDist = Math.abs(best - referenceMidi);

  for (const octave of [center - 1, center + 1]) {
    const candidate = clampMidi(pc + 12 * octave);
    const dist = Math.abs(candidate - referenceMidi);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }

  return best;
}

export class BorrowingLogic {
  public getRootPositionMapping(chord: Chord): Record<number, number> {
    if (chord.rootPositionIndex === undefined) return NOTE_POSITION_MAPPING;

    const rootIdx = chord.rootPositionIndex;
    const thirdIdx = (rootIdx + 1) % 4;
    const fifthIdx = (rootIdx + 2) % 4;
    const seventhIdx = (rootIdx + 3) % 4;

    return {
      1: rootIdx,
      2: thirdIdx,
      3: fifthIdx,
      4: seventhIdx
    };
  }

  // Caches unique pitch classes (mod 12) from an array of pitches to avoid redundant Math.floor/modulo.
  private getUniquePitchClasses(pitches: number[]): number[] {
    const pces = new Set<number>();
    for (let i = 0; i < pitches.length; i++) {
      pces.add(pitches[i] % 12);
    }
    return Array.from(pces);
  }

  public findNextHigherNote(referencePitch: number, availablePitches: number[]): number {
    const referencePc = referencePitch % 12;
    const referenceOctave = Math.floor(referencePitch / 12);

    let minHigherPc = 12; // Modulo max is 11, so 12 acts as Infinity
    let minPc = 12;

    const uniquePCs = this.getUniquePitchClasses(availablePitches);

    for (let i = 0; i < uniquePCs.length; i++) {
      const pc = uniquePCs[i];
      if (pc < minPc) minPc = pc;
      if (pc > referencePc && pc < minHigherPc) minHigherPc = pc;
    }

    if (minHigherPc !== 12) {
      return minHigherPc + (referenceOctave * 12);
    } else {
      return minPc + ((referenceOctave + 1) * 12);
    }
  }

  public findNextLowerNote(referencePitch: number, availablePitches: number[]): number {
    const referencePc = referencePitch % 12;
    const referenceOctave = Math.floor(referencePitch / 12);

    let maxLowerPc = -1; // Modulo min is 0, so -1 acts as -Infinity
    let maxPc = -1;

    const uniquePCs = this.getUniquePitchClasses(availablePitches);

    for (let i = 0; i < uniquePCs.length; i++) {
      const pc = uniquePCs[i];
      if (pc > maxPc) maxPc = pc;
      if (pc < referencePc && pc > maxLowerPc) maxLowerPc = pc;
    }

    if (maxLowerPc !== -1) {
      return maxLowerPc + (referenceOctave * 12);
    } else {
      return maxPc + ((referenceOctave - 1) * 12);
    }
  }

  public generateActivePitches(chord: Chord, state: BorrowingState): (number | null)[] {
    return chordManager.applyVoicing(this.generatePitchStructure(chord, state));
  }

  /** Pitch classes to drop from a voiced chord when voice lines are muted. */
  public getMutedPitchClasses(chord: Chord, state: BorrowingState): Set<number> {
    return this.prepareVoicingInput(chord, state).mutedPitchClasses;
  }

  /**
   * Build borrowed 4-slot structure and mute set together.
   *
   * Mutes are applied after ladder voicing by pitch class. If borrowing
   * collapsed two lines to the same PC, muting one line removes every
   * voiced note with that PC.
   */
  public prepareVoicingInput(
    chord: Chord,
    state: BorrowingState
  ): {
    pitchStructure: (number | null)[];
    mutedPitchClasses: Set<number>;
  } {
    const borrowedPitches = this.applyBorrowing(chord, state, true);
    const rootPositionMapping = this.getRootPositionMapping(chord);
    const pitchStructure: (number | null)[] = [null, null, null, null];
    const mutedPitchClasses = new Set<number>();

    for (let line = 1; line <= 4; line++) {
      const noteIndex = rootPositionMapping[line];
      if (noteIndex < borrowedPitches.length) {
        pitchStructure[noteIndex] = borrowedPitches[noteIndex];
      }
      if (state.noteStates[line] === 'off' && noteIndex < borrowedPitches.length) {
        // Overlay skips muted lines, so neutral PCs remain in the spread.
        // Mute must target the home pitch class; also drop borrowed PC if
        // the slider still shows up/down when toggled off.
        mutedPitchClasses.add(pitchClass(chord.pitches[noteIndex]));
        if (state.circlePositions[line] !== 'line') {
          mutedPitchClasses.add(pitchClass(borrowedPitches[noteIndex]));
        }
      }
    }

    return { pitchStructure, mutedPitchClasses };
  }

  /** Full 4-slot structure for tilt voicing (borrowing on, all voices on). */
  public generatePitchStructureForVoicing(
    chord: Chord,
    state: BorrowingState
  ): (number | null)[] {
    return this.prepareVoicingInput(chord, state).pitchStructure;
  }

  public filterVoicingMutes(
    voicedPitches: number[],
    mutedPitchClasses: Set<number>
  ): number[] {
    if (mutedPitchClasses.size === 0) return voicedPitches;
    // Mutes by pitch class: if borrowing collapsed two lines to the same
    // PC, muting one line removes every voiced note with that PC.
    return voicedPitches.filter(
      (pitch) => !mutedPitchClasses.has(pitchClass(pitch))
    );
  }

  /** Natural and borrowed pitch classes for one harmonic voice line. */
  public getVoicePitchClasses(
    chord: Chord,
    state: BorrowingState,
    line: number
  ): { naturalPc: number; effectivePc: number } {
    const rootPositionMapping = this.getRootPositionMapping(chord);
    const noteIndex = rootPositionMapping[line];
    const naturalPc = pitchClass(chord.pitches[noteIndex]);
    const borrowedPitches = this.applyBorrowing(chord, state, true);
    const effectivePc = pitchClass(borrowedPitches[noteIndex]);
    return { naturalPc, effectivePc };
  }

  /**
   * Substitute borrowed pitch classes on an anchored neutral voicing.
   * Each active borrow replaces natural PCs with the closest MIDI match.
   */
  public applyBorrowingOverlay(
    neutralVoicing: number[],
    chord: Chord,
    state: BorrowingState
  ): number[] {
    const rootPositionMapping = this.getRootPositionMapping(chord);
    const borrowedPitches = this.applyBorrowing(chord, state, true);
    let result = neutralVoicing;

    for (let line = 1; line <= 4; line++) {
      if (state.noteStates[line] === 'off') continue;
      if (state.circlePositions[line] === 'line') continue;

      const noteIndex = rootPositionMapping[line];
      const naturalPc = pitchClass(chord.pitches[noteIndex]);
      const borrowedPc = pitchClass(borrowedPitches[noteIndex]);
      if (naturalPc === borrowedPc) continue;

      result = result.map((note) => {
        if (pitchClass(note) !== naturalPc) return note;
        return closestMidiWithPitchClass(note, borrowedPc);
      });
    }

    return result;
  }

  /** Borrow substitution then mute filter on an anchored neutral voicing. */
  public applyVoicingOverlays(
    neutralVoicing: number[],
    chord: Chord,
    state: BorrowingState
  ): number[] {
    const withBorrowing = this.applyBorrowingOverlay(
      neutralVoicing,
      chord,
      state
    );
    return this.filterVoicingMutes(
      withBorrowing,
      this.getMutedPitchClasses(chord, state)
    );
  }

  private applyBorrowing(
    chord: Chord,
    state: BorrowingState,
    ignoreMute: boolean
  ): number[] {
    const borrowedPitches = [...chord.pitches];
    const oppositeElement = ELEMENTAL_RELATIONSHIPS[chord.name]?.[0];

    if (!oppositeElement) return borrowedPitches;

    const oppositeChord = chordManager.getElementalChord(oppositeElement);
    if (!oppositeChord) return borrowedPitches;

    const oppositePitches = oppositeChord.pitches;
    const rootPositionMapping = this.getRootPositionMapping(chord);

    for (let line = 1; line <= 4; line++) {
      if (!ignoreMute && state.noteStates[line] === 'off') continue;

      if (state.circlePositions[line] !== 'line') {
        const direction = state.borrowingDirections[line];
        const targetNoteIndex = rootPositionMapping[line];

        if (targetNoteIndex < borrowedPitches.length) {
          const targetPitch = borrowedPitches[targetNoteIndex];
          let replacement = targetPitch;

          if (direction === 'up') {
            replacement = this.findNextHigherNote(targetPitch, oppositePitches);
          } else if (direction === 'down') {
            replacement = this.findNextLowerNote(targetPitch, oppositePitches);
          }

          borrowedPitches[targetNoteIndex] = replacement;
        }
      }
    }

    return borrowedPitches;
  }

  // Pre-voicing pitch structure: borrowing applied, voices toggled off as
  // nulls, no octave-range or drop-voicing offsets. Used directly by the
  // tilt play style, which voices chords itself.
  public generatePitchStructure(chord: Chord, state: BorrowingState): (number | null)[] {
    const borrowedPitches = this.applyBorrowing(chord, state, false);

    const fullPitchStructure: (number | null)[] = [null, null, null, null];
    const rootPositionMapping = this.getRootPositionMapping(chord);

    for (let line = 1; line <= 4; line++) {
      if (state.noteStates[line] === 'on') {
        const noteIndex = rootPositionMapping[line];
        if (noteIndex < borrowedPitches.length) {
          fullPitchStructure[noteIndex] = borrowedPitches[noteIndex];
        }
      }
    }

    return fullPitchStructure;
  }
}

export const borrowingLogic = new BorrowingLogic();
