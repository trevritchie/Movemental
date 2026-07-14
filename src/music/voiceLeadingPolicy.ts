/**
 * Single voice-leading policy entry for playback re-anchor.
 *
 * Mode-specific math stays in predeterminedVoiceLeading, smoothestVoiceLeading,
 * elementalRoot, and playbackTiltResolution. Hooks should call this dispatcher
 * instead of branching on VoiceLeadingMode beside those helpers.
 */
import type { Chord } from './ChordManager';
import type { VoiceLeadingMode } from './sessionModes';
import type { TiltSample } from './TiltVoicingEngine';
import {
  resolveEffectiveTiltForLabel,
  resolveSmoothReanchorTilt,
  resolveSmoothestReanchorTilt,
  type SmoothReanchorTiltOptions,
  type SmoothestReanchorCallbacks,
} from './playbackTiltResolution';

export type { SmoothReanchorTiltOptions, SmoothestReanchorCallbacks };

/** Inputs for choosing a new playback tilt when the anchor key changes. */
export interface ReanchorPlaybackTiltRequest {
  mode: VoiceLeadingMode;
  displayChord: Chord;
  tiltMode: boolean;
  /** Control / baseline tilt before mode-specific adjustment. */
  playbackTilt: TiltSample;
  smooth: SmoothReanchorTiltOptions;
  smoothest: {
    neutralVoicingLength: number;
    isChordChange: boolean;
    smoothBaseParallelRef: { current: number };
    callbacks: SmoothestReanchorCallbacks;
  };
}

/**
 * Resolve playback tilt for the active voice-leading mode on re-anchor.
 *
 * root_position keeps the control tilt (flat-parallel baseline is already
 * encoded by resolvePlaybackTilt upstream).
 */
export function resolveReanchorPlaybackTilt(
  request: ReanchorPlaybackTiltRequest,
): TiltSample {
  const { mode, displayChord, tiltMode, playbackTilt } = request;

  if (mode === 'smooth') {
    return resolveSmoothReanchorTilt(displayChord, tiltMode, request.smooth);
  }

  if (mode === 'smoothest') {
    const {
      neutralVoicingLength,
      isChordChange,
      smoothBaseParallelRef,
      callbacks,
    } = request.smoothest;
    return resolveSmoothestReanchorTilt(
      displayChord,
      playbackTilt,
      neutralVoicingLength,
      isChordChange,
      smoothBaseParallelRef,
      callbacks,
    );
  }

  return playbackTilt;
}

/** Bass-label effective tilt (same rules as playback navigation). */
export const resolveLabelPlaybackTilt = resolveEffectiveTiltForLabel;
