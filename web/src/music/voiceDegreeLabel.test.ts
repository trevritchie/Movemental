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
  resolveTiltBassVoiceLine,
  tiltBassDegreeLabel,
  type TiltBassLabelContext,
} from './voiceDegreeLabel';

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
  it('returns the degree name on mobile and desktop', () => {
    expect(formatBassDegreeLabel('Root', 'mobile')).toBe('Root');
    expect(formatBassDegreeLabel('Root', 'desktop')).toBe('Root');
    expect(formatBassDegreeLabel('7th', 'desktop')).toBe('7th');
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

  it('maps flat Double Octave Branch to Root on mobile and desktop', () => {
    const branch = manager.getChordByName('Branch')!;
    const context = labelContext();
    expect(
      tiltBassDegreeLabel({ x: 0, y: 0 }, branch, 'mobile', context)
    ).toBe('Root');
    expect(
      tiltBassDegreeLabel({ x: 0, y: 0 }, branch, 'desktop', context)
    ).toBe('Root');
  });

  it('maps flat Drop 3 Branch to 3rd when roll narrows the voicing', () => {
    const branch = manager.getChordByName('Branch')!;
    const context = labelContext();
    expect(
      tiltBassDegreeLabel({ x: -0.25, y: 0 }, branch, 'mobile', context)
    ).toBe('3rd');
    expect(
      tiltBassDegreeLabel({ x: -0.25, y: 0 }, branch, 'desktop', context)
    ).toBe('3rd');
  });

  it('maps chest-ward tilt to ↑ 3rd at Double Octave width', () => {
    const branch = manager.getChordByName('Branch')!;
    const context = labelContext();
    expect(
      tiltBassDegreeLabel({ x: 0, y: -0.25 }, branch, 'mobile', context)
    ).toBe('\u2191 3rd');
    expect(
      tiltBassDegreeLabel({ x: 0, y: -0.25 }, branch, 'desktop', context)
    ).toBe('\u2191 3rd');
  });

  it('maps away-from-chest tilt to ↓ 6th at Double Octave width', () => {
    const branch = manager.getChordByName('Branch')!;
    const context = labelContext();
    expect(
      tiltBassDegreeLabel({ x: 0, y: 0.25 }, branch, 'mobile', context)
    ).toBe('\u2193 6th');
    expect(
      tiltBassDegreeLabel({ x: 0, y: 0.25 }, branch, 'desktop', context)
    ).toBe('\u2193 6th');
  });

  it('maps 4th pivot on Twin Branch to ↑ 6th', () => {
    const twinBranch = manager.getChordByName('Twin Branch')!;
    const context = labelContext();
    expect(
      tiltBassDegreeLabel({ x: 0, y: -0.75 }, twinBranch, 'mobile', context)
    ).toBe('\u2191 6th');
    expect(
      tiltBassDegreeLabel({ x: 0, y: -0.75 }, twinBranch, 'desktop', context)
    ).toBe('\u2191 6th');
  });

  it('maps 4th pivot on Sand-Storm to ↑ 7th', () => {
    const sandStorm = manager.getChordByName('Sand-Storm')!;
    const context = labelContext();
    expect(
      tiltBassDegreeLabel({ x: 0, y: -0.75 }, sandStorm, 'mobile', context)
    ).toBe('\u2191 7th');
    expect(
      tiltBassDegreeLabel({ x: 0, y: -0.75 }, sandStorm, 'desktop', context)
    ).toBe('\u2191 7th');
  });

  it('falls back to pitch-only labels when context is omitted', () => {
    const branch = manager.getChordByName('Branch')!;
    expect(tiltBassDegreeLabel({ x: -0.25, y: 0 }, branch, 'mobile')).toBe(
      'Root'
    );
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
    expect(bassDegreeLabelsForSelect(sandStorm, 'desktop')).toEqual([
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

  it('lists mobile labels with 6th when no chord is selected', () => {
    expect(bassDegreeLabelsForSelect(null, 'mobile')).toEqual([
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
    expect(getBassDegreeLabelForParallelSteps(3, null, 'mobile')).toBe('\u2191 6th');
  });

  it('maps legacy position index 3 to ↑ 6th when no chord is selected', () => {
    expect(getBassDegreeLabelForPositionIndex(3, null, 'mobile')).toBe('\u2191 6th');
  });
});
