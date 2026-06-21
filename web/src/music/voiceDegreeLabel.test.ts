import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import { getInitialBorrowingState } from './BorrowingLogic';
import {
  bassDegreeLabelsForSelect,
  formatBassDegreeLabel,
  formatBassDegreeWithDirection,
  getBassDegreeLabelForParallelSteps,
  getBassDegreeLabelForPositionIndex,
  getFourthVoiceDegreeLabel,
  getVoiceDegreeLabel,
  formatLastPlayedTiltReadout,
  lastPlayedBassReadout,
  lastPlayedVoicingReadout,
  resolveTiltBassVoiceLine,
  tiltBassDegreeLabel,
  tiltBassPositionLabel,
  type TiltBassLabelContext,
} from './voiceDegreeLabel';
import { tiltSampleFromLevels } from './TiltVoicingEngine';

const OCTAVE_RANGE = 3;
const TONAL_CENTER = 0;

function labelContext(): TiltBassLabelContext {
  return {
    tonalCenter: TONAL_CENTER,
    octaveRange: OCTAVE_RANGE,
    borrowingState: getInitialBorrowingState(),
  };
}

describe('getFourthVoiceDegreeLabel', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
  });

  it('returns 6th for maj6, min6, and diminished', () => {
    expect(getFourthVoiceDegreeLabel(manager.getChordByName('Branch')!)).toBe(
      '6th'
    );
    expect(getFourthVoiceDegreeLabel(manager.getChordByName('Trunk')!)).toBe(
      '6th'
    );
    expect(getFourthVoiceDegreeLabel(manager.getChordByName('Earth')!)).toBe(
      '6th'
    );
  });

  it('returns 7th for dom7 and dom7b5', () => {
    expect(
      getFourthVoiceDegreeLabel(manager.getChordByName('Sand-Storm')!)
    ).toBe('7th');
    expect(getFourthVoiceDegreeLabel(manager.getChordByName('Leaf')!)).toBe(
      '7th'
    );
  });

  it('defaults to 6th when no chord is selected', () => {
    expect(getFourthVoiceDegreeLabel(null)).toBe('6th');
  });
});

describe('formatBassDegreeLabel', () => {
  it('returns the degree name', () => {
    expect(formatBassDegreeLabel('Root')).toBe('Root');
    expect(formatBassDegreeLabel('7th')).toBe('7th');
  });
});

describe('formatBassDegreeWithDirection', () => {
  it('prefixes higher and lower parallel positions', () => {
    expect(formatBassDegreeWithDirection('3rd', 1)).toBe('\u2191 3rd');
    expect(formatBassDegreeWithDirection('6th', -1)).toBe('\u2193 6th');
    expect(formatBassDegreeWithDirection('Root', 0)).toBe('Root');
  });
});

describe('tiltBassDegreeLabel', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
  });

  it('maps flat Double Octave Branch to Root', () => {
    const branch = manager.getChordByName('Branch')!;
    const context = labelContext();
    expect(tiltBassDegreeLabel({ x: 0, y: 0 }, branch, context)).toBe('Root');
  });

  it('maps flat Drop 3 Branch to 3rd when roll narrows the voicing', () => {
    const branch = manager.getChordByName('Branch')!;
    const context = labelContext();
    expect(tiltBassDegreeLabel({ x: -0.25, y: 0 }, branch, context)).toBe(
      '3rd'
    );
  });

  it('maps chest-ward tilt to ↑ 3rd at Double Octave width', () => {
    const branch = manager.getChordByName('Branch')!;
    const context = labelContext();
    expect(tiltBassDegreeLabel({ x: 0, y: -0.25 }, branch, context)).toBe(
      '\u2191 3rd'
    );
  });

  it('maps away-from-chest tilt to ↓ 6th at Double Octave width', () => {
    const branch = manager.getChordByName('Branch')!;
    const context = labelContext();
    expect(tiltBassDegreeLabel({ x: 0, y: 0.25 }, branch, context)).toBe(
      '\u2193 6th'
    );
  });

  it('maps 4th pivot on Twin Branch to ↑ 6th', () => {
    const twinBranch = manager.getChordByName('Twin Branch')!;
    const context = labelContext();
    expect(
      tiltBassDegreeLabel({ x: 0, y: -0.75 }, twinBranch, context)
    ).toBe('\u2191 6th');
  });

  it('maps 4th pivot on Sand-Storm to ↑ 7th', () => {
    const sandStorm = manager.getChordByName('Sand-Storm')!;
    const context = labelContext();
    expect(
      tiltBassDegreeLabel({ x: 0, y: -0.75 }, sandStorm, context)
    ).toBe('\u2191 7th');
  });

  it('falls back to pitch-only labels when context is omitted', () => {
    const branch = manager.getChordByName('Branch')!;
    expect(tiltBassDegreeLabel({ x: -0.25, y: 0 }, branch)).toBe('Root');
  });
});

describe('tiltBassPositionLabel', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
  });

  it('maps chest-ward tilt to parallel position with arrow', () => {
    const branch = manager.getChordByName('Branch')!;
    const context = labelContext();
    expect(
      tiltBassPositionLabel({ x: 0, y: -0.25 }, branch, context)
    ).toBe('\u2191 3rd');
  });

  it('maps flat tilt to root position', () => {
    const branch = manager.getChordByName('Branch')!;
    expect(
      tiltBassPositionLabel({ x: 0, y: 0 }, branch, labelContext())
    ).toBe('Root');
  });
});

describe('lastPlayed readouts', () => {
  it('formats combined last played string', () => {
    const manager = new ChordManager();
    const branch = manager.getChordByName('Branch')!;
    const tilt = tiltSampleFromLevels(5, 1);
    expect(formatLastPlayedTiltReadout(tilt, branch)).toBe('Drop 2 / 3rd');
  });

  it('formats voicing and bass parts separately', () => {
    const manager = new ChordManager();
    const branch = manager.getChordByName('Branch')!;
    const tilt = tiltSampleFromLevels(5, 1);
    expect(lastPlayedVoicingReadout(tilt)).toBe('Drop 2');
    expect(lastPlayedBassReadout(tilt, branch)).toBe('3rd');
  });
});

describe('resolveTiltBassVoiceLine', () => {
  it('returns voice line 2 for flat Drop 3 on Branch', () => {
    const manager = new ChordManager();
    const branch = manager.getChordByName('Branch')!;
    expect(
      resolveTiltBassVoiceLine(
        { x: -0.25, y: 0 },
        branch,
        labelContext()
      )
    ).toBe(2);
  });
});

describe('bassDegreeLabelsForSelect', () => {
  it('lists nine signed position labels for dom7 chords', () => {
    const manager = new ChordManager();
    const sandStorm = manager.getChordByName('Sand-Storm')!;
    expect(bassDegreeLabelsForSelect(sandStorm)).toEqual([
      '\u2193 Root',
      '\u2193 3rd',
      '\u2193 5th',
      '\u2193 7th',
      'Root',
      '\u2191 3rd',
      '\u2191 5th',
      '\u2191 7th',
      '\u2191 Root',
    ]);
  });

  it('lists labels with 6th when no chord is selected', () => {
    expect(bassDegreeLabelsForSelect(null)).toEqual([
      '\u2193 Root',
      '\u2193 3rd',
      '\u2193 5th',
      '\u2193 6th',
      'Root',
      '\u2191 3rd',
      '\u2191 5th',
      '\u2191 6th',
      '\u2191 Root',
    ]);
  });
});

describe('getVoiceDegreeLabel', () => {
  it('maps voice lines 1-3 without chord context', () => {
    expect(getVoiceDegreeLabel(1, null)).toBe('Root');
    expect(getVoiceDegreeLabel(2, null)).toBe('3rd');
    expect(getVoiceDegreeLabel(3, null)).toBe('5th');
  });

  it('maps parallel step +3 to ↑ 6th when no chord is selected', () => {
    expect(getBassDegreeLabelForParallelSteps(3, null)).toBe('\u2191 6th');
  });

  it('maps legacy position index 3 to ↑ 6th when no chord is selected', () => {
    expect(getBassDegreeLabelForPositionIndex(3, null)).toBe('\u2191 6th');
  });
});
