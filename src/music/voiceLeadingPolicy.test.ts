import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FLAT_TILT, type TiltSample } from './TiltVoicingEngine';
import {
  resolveReanchorPlaybackTilt,
  type SmoothReanchorTiltOptions,
  type SmoothestReanchorTiltOptions,
} from './voiceLeadingPolicy';
import { chordManager } from './ChordManager';

describe('voiceLeadingPolicy.resolveReanchorPlaybackTilt', () => {
  const wind = chordManager.getChordByName('Wind')!;
  const baseTilt: TiltSample = FLAT_TILT;
  const smoothTilt: TiltSample = { x: 1, y: 2 };
  const smoothestTilt: TiltSample = { x: 3, y: 4 };

  let resolveSmoothPlaybackTiltForNavigation: ReturnType<
    typeof vi.fn<(chord: typeof wind, liveTilt: TiltSample, isChordChange: boolean) => TiltSample>
  >;
  let applySmoothestVoiceLeading: ReturnType<
    typeof vi.fn<(displayChord: typeof wind) => TiltSample>
  >;
  let smooth: SmoothReanchorTiltOptions;
  let smoothest: SmoothestReanchorTiltOptions;

  beforeEach(() => {
    resolveSmoothPlaybackTiltForNavigation = vi.fn(() => smoothTilt);
    applySmoothestVoiceLeading = vi.fn(() => smoothestTilt);
    smooth = {
      isChordChange: false,
      isFirstChord: false,
      isOppositeElement: false,
      previousChord: null,
      lockMaps: { voicing: {}, bass: {} },
      noTiltVoicingLevel: 0,
      noTiltPositionLevel: 0,
      lastNoTiltPositionLevel: 0,
      resolveSmoothPlaybackTiltForNavigation,
      getCurrentControlTilt: () => baseTilt,
      syncNoTiltPositionLevel: vi.fn(),
    };
    smoothest = {
      neutralVoicingLength: 4,
      isChordChange: true,
      smoothBaseParallelRef: { current: 0 },
      callbacks: {
        applySmoothestVoiceLeading,
        preserveSameChordSmoothestTilt: vi.fn(() => baseTilt),
        getBaselineTilt: () => baseTilt,
        getCurrentControlTilt: () => baseTilt,
      },
    };
  });

  it('routes smooth mode through resolveSmoothPlaybackTiltForNavigation', () => {
    const result = resolveReanchorPlaybackTilt({
      mode: 'smooth',
      displayChord: wind,
      tiltMode: true,
      playbackTilt: baseTilt,
      smooth: {
        ...smooth,
        isChordChange: true,
      },
    });

    expect(resolveSmoothPlaybackTiltForNavigation).toHaveBeenCalled();
    expect(result).toEqual(smoothTilt);
    expect(applySmoothestVoiceLeading).not.toHaveBeenCalled();
  });

  it('routes smoothest mode through applySmoothestVoiceLeading on chord change', () => {
    const result = resolveReanchorPlaybackTilt({
      mode: 'smoothest',
      displayChord: wind,
      tiltMode: false,
      playbackTilt: baseTilt,
      smoothest,
    });

    expect(applySmoothestVoiceLeading).toHaveBeenCalled();
    expect(result).toEqual(smoothestTilt);
  });

  it('returns the control tilt unchanged for root_position', () => {
    const control: TiltSample = { x: 9, y: -3 };
    const result = resolveReanchorPlaybackTilt({
      mode: 'root_position',
      displayChord: wind,
      tiltMode: true,
      playbackTilt: control,
    });

    expect(result).toBe(control);
    expect(resolveSmoothPlaybackTiltForNavigation).not.toHaveBeenCalled();
    expect(applySmoothestVoiceLeading).not.toHaveBeenCalled();
  });
});
