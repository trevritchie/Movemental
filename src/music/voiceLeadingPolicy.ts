/**
 * Single voice-leading policy entry for playback re-anchor.
 *
 * Mode-specific math stays in predeterminedVoiceLeading, smoothestVoiceLeading,
 * elementalRoot, and playbackTiltResolution. Hooks should call this dispatcher
 * instead of branching on VoiceLeadingMode beside those helpers.
 */
import type { Chord } from './ChordManager';
import type { TiltSample } from './TiltVoicingEngine';
import {
  resolveEffectiveTiltForLabel,
  resolveSmoothReanchorTilt,
  resolveSmoothestReanchorTilt,
  type SmoothReanchorTiltOptions,
  type SmoothestReanchorCallbacks,
} from './playbackTiltResolution';

export type { SmoothReanchorTiltOptions, SmoothestReanchorCallbacks };

/** Shared fields for every re-anchor mode. */
interface ReanchorPlaybackTiltBase {
  displayChord: Chord;
  tiltMode: boolean;
  /** Control / baseline tilt before mode-specific adjustment. */
  playbackTilt: TiltSample;
}

export type SmoothestReanchorTiltOptions = {
  neutralVoicingLength: number;
  isChordChange: boolean;
  smoothBaseParallelRef: { current: number };
  callbacks: SmoothestReanchorCallbacks;
};

/**
 * Mode-discriminated re-anchor request. Callers supply only the bag required
 * for the active VoiceLeadingMode.
 */
export type ReanchorPlaybackTiltRequest =
  | (ReanchorPlaybackTiltBase & {
      mode: 'root_position';
    })
  | (ReanchorPlaybackTiltBase & {
      mode: 'smooth';
      smooth: SmoothReanchorTiltOptions;
    })
  | (ReanchorPlaybackTiltBase & {
      mode: 'smoothest';
      smoothest: SmoothestReanchorTiltOptions;
    });

/**
 * Resolve playback tilt for the active voice-leading mode on re-anchor.
 *
 * root_position keeps the control tilt (flat-parallel baseline is already
 * encoded by resolvePlaybackTilt upstream).
 */
export function resolveReanchorPlaybackTilt(
  request: ReanchorPlaybackTiltRequest,
): TiltSample {
  switch (request.mode) {
    case 'smooth':
      return resolveSmoothReanchorTilt(
        request.displayChord,
        request.tiltMode,
        request.smooth,
      );
    case 'smoothest': {
      const {
        neutralVoicingLength,
        isChordChange,
        smoothBaseParallelRef,
        callbacks,
      } = request.smoothest;
      return resolveSmoothestReanchorTilt(
        request.displayChord,
        request.playbackTilt,
        neutralVoicingLength,
        isChordChange,
        smoothBaseParallelRef,
        callbacks,
      );
    }
    case 'root_position':
      return request.playbackTilt;
  }
}

/** Bass-label effective tilt (same rules as playback navigation). */
export const resolveLabelPlaybackTilt = resolveEffectiveTiltForLabel;
