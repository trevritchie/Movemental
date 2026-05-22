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

  public findNextHigherNote(referencePitch: number, availablePitches: number[]): number {
    const referencePc = referencePitch % 12;
    const referenceOctave = Math.floor(referencePitch / 12);

    let minHigherPc = Infinity;
    let minPc = Infinity;

    for (let i = 0; i < availablePitches.length; i++) {
      const pc = availablePitches[i] % 12;
      if (pc < minPc) {
        minPc = pc;
      }
      if (pc > referencePc && pc < minHigherPc) {
        minHigherPc = pc;
      }
    }

    if (minHigherPc !== Infinity) {
      return minHigherPc + (referenceOctave * 12);
    } else {
      return minPc + ((referenceOctave + 1) * 12);
    }
  }

  public findNextLowerNote(referencePitch: number, availablePitches: number[]): number {
    const referencePc = referencePitch % 12;
    const referenceOctave = Math.floor(referencePitch / 12);

    let maxLowerPc = -Infinity;
    let maxPc = -Infinity;

    for (let i = 0; i < availablePitches.length; i++) {
      const pc = availablePitches[i] % 12;
      if (pc > maxPc) {
        maxPc = pc;
      }
      if (pc < referencePc && pc > maxLowerPc) {
        maxLowerPc = pc;
      }
    }

    if (maxLowerPc !== -Infinity) {
      return maxLowerPc + (referenceOctave * 12);
    } else {
      return maxPc + ((referenceOctave - 1) * 12);
    }
  }

  public generateActivePitches(chord: Chord, state: BorrowingState): (number | null)[] {
    const borrowedPitches = [...chord.pitches];

    const oppositeElement = ELEMENTAL_RELATIONSHIPS[chord.name]?.[0];

    if (oppositeElement) {
      const oppositeChord = chordManager.getElementalChord(oppositeElement);
      if (oppositeChord) {
        const oppositePitches = oppositeChord.pitches;
        const rootPositionMapping = this.getRootPositionMapping(chord);

        for (let line = 1; line <= 4; line++) {
          if (state.noteStates[line] === 'off') continue;

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
      }
    }

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

    return chordManager.applyVoicing(fullPitchStructure);
  }
}

export const borrowingLogic = new BorrowingLogic();
