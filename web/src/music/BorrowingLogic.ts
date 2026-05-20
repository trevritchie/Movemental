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
    const availablePcs = availablePitches.map(p => p % 12);

    const higherPcs = availablePcs.filter(pc => pc > referencePc);

    if (higherPcs.length > 0) {
      return Math.min(...higherPcs) + (referenceOctave * 12);
    } else {
      return Math.min(...availablePcs) + ((referenceOctave + 1) * 12);
    }
  }

  public findNextLowerNote(referencePitch: number, availablePitches: number[]): number {
    const referencePc = referencePitch % 12;
    const referenceOctave = Math.floor(referencePitch / 12);
    const availablePcs = availablePitches.map(p => p % 12);

    const lowerPcs = availablePcs.filter(pc => pc < referencePc);

    if (lowerPcs.length > 0) {
      return Math.max(...lowerPcs) + (referenceOctave * 12);
    } else {
      return Math.max(...availablePcs) + ((referenceOctave - 1) * 12);
    }
  }

  public generateActivePitches(chord: Chord, state: BorrowingState): (number | null)[] {
    const originalPitches = [...chord.pitches].sort((a, b) => a - b);
    const borrowedPitches = [...originalPitches];

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
