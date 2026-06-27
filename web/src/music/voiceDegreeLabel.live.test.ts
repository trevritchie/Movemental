import { describe, it, expect, beforeEach } from 'vitest';
import { ChordManager } from './ChordManager';
import { getInitialBorrowingState } from './BorrowingLogic';
import { resolveSmoothPlaybackTilt } from './predeterminedVoiceLeading';
import { tiltSampleFromLevels } from './TiltVoicingEngine';
import {
  resolveTiltBassVoiceLine,
  tiltBassDegreeLabel,
  getVoiceDegreeLabel,
  type TiltBassLabelContext,
} from './voiceDegreeLabel';
import { invalidateVoicingCache } from './voicingCache';

const TONAL_CENTER = 10;
const OCTAVE_RANGE = 2;
const FLAT = tiltSampleFromLevels(8, 0);
const PITCH_UP = { x: 0, y: -0.25 };
const ROLL_NARROW = tiltSampleFromLevels(2, 0);

describe('live tilt bass label', () => {
  let manager: ChordManager;

  beforeEach(() => {
    manager = new ChordManager();
    manager.setTonalCenterOffset(TONAL_CENTER);
    manager.setOctaveRange(OCTAVE_RANGE);
    invalidateVoicingCache();
  });

  function smoothContext(previousName?: string): TiltBassLabelContext {
    const glassCommitted = resolveSmoothPlaybackTilt('Glass', FLAT);
    return {
      tonalCenter: TONAL_CENTER,
      octaveRange: OCTAVE_RANGE,
      borrowingState: getInitialBorrowingState(),
      tiltModeEnabled: true,
      voiceLeadingMode: 'smooth',
      previousChord: previousName
        ? manager.getChordByName(previousName)
        : undefined,
      lastTapTilt: FLAT,
      lastCommittedPlaybackTilt: glassCommitted,
    };
  }

  it('updates degree when pitch tilt changes without activePitches in context', () => {
    const branch = manager.getChordByName('Branch')!;
    const context = smoothContext();

    const flatLabel = tiltBassDegreeLabel(FLAT, branch, context);
    const pitchedLabel = tiltBassDegreeLabel(PITCH_UP, branch, context);
    expect(pitchedLabel).not.toBe(flatLabel);
  });

  it('activePitches in context still freezes live degree readout', () => {
    const branch = manager.getChordByName('Branch')!;
    const frozen: TiltBassLabelContext = {
      ...smoothContext(),
      activePitches: [46, 50, 53, 57],
    };
    const flatLabel = tiltBassDegreeLabel(FLAT, branch, frozen);
    const pitchedLabel = tiltBassDegreeLabel(PITCH_UP, branch, frozen);
    const flatDegree = flatLabel.replace(/^[↑↓]\s*/, '');
    const pitchedDegree = pitchedLabel.replace(/^[↑↓]\s*/, '');
    expect(pitchedDegree).toBe(flatDegree);
  });

  it('updates voice line when roll changes on the same chord', () => {
    const branch = manager.getChordByName('Branch')!;
    const context = smoothContext();
    const flatLine = resolveTiltBassVoiceLine(FLAT, branch, context);
    const narrowLine = resolveTiltBassVoiceLine(ROLL_NARROW, branch, context);
    expect(flatLine).not.toBeNull();
    expect(narrowLine).not.toBeNull();
    expect(getVoiceDegreeLabel(flatLine!, branch)).not.toBe(
      getVoiceDegreeLabel(narrowLine!, branch)
    );
  });
});
