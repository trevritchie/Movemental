/**
 * Audio dispatch and post-audio state commit for chord playback.
 *
 * Extracted from useChordPlayback.ts: this sub-hook owns "what happens once
 * we know which pitches to sound" - sending them to AudioEngine, then
 * syncing chord identity, voice-leading baselines, and tilt readout labels.
 * It is composed into useChordPlayback rather than used standalone.
 */
import { useCallback, startTransition, type RefObject } from 'react';
import { type Chord } from '../music/ChordManager';
import { type BorrowingState } from '../music/BorrowingLogic';
import {
  noTiltLevelsFromTilt,
  parallelLevelFromTilt,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import { type ElementalPlaybackResolution } from '../music/tiltVoicingPlayback';
import { invalidateVoicingCacheForCommit } from '../music/voicingCache';
import {
  lastPlayedBassReadout,
  lastPlayedVoicingReadout,
} from '../music/voiceDegreeLabel';
import { audioEngine } from '../audio/AudioEngine';
import { isPageInteractiveForAudio } from '../audio/pageInteraction';
import type { PlayStyle, VoiceLeadingMode } from '../music/sessionModes';
import {
  commitsSmoothestParallelBaseline,
  usesDeviceTilt,
} from '../music/sessionModes';
import { isElementalName } from '../music/elementalRoot';
import {
  armNoTiltRevoiceSuppress,
  type NoTiltRevoiceSuppressState,
} from '../music/noTiltRevoiceSuppress';

function pitchesEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export interface DispatchAudioOptions {
  retrigger?: boolean;
  skipIfUnchanged?: boolean;
  fromPointer?: boolean;
  /**
   * When true, apply a set-membership voicing diff (Tilt to Strum) instead of
   * legato triggerAttack / timed playNotes.
   */
  voicingDiff?: boolean;
}

export interface CommitPlaybackOptions extends DispatchAudioOptions {
  borrowingStateOverride?: BorrowingState;
}

interface UsePlaybackCommitOptions {
  playStyleRef: RefObject<PlayStyle>;
  tiltModeRef: RefObject<boolean>;
  activePitchesRef: RefObject<number[]>;
  previousChordRef: RefObject<Chord | null>;
  selectedChordNameRef: RefObject<string | null>;
  suppressNoTiltRevoiceRef: RefObject<NoTiltRevoiceSuppressState>;
  rawTiltRef: RefObject<TiltSample>;
  lastTapTiltRef: RefObject<TiltSample>;
  lastCommittedPlaybackTiltRef: RefObject<TiltSample>;
  smoothBaseParallelRef: RefObject<number>;
  lastNoTiltVoicingLevelRef: RefObject<number>;
  lastNoTiltPositionLevelRef: RefObject<number>;
  voiceLeadingModeRef: RefObject<VoiceLeadingMode>;
  borrowingStateRef: RefObject<BorrowingState>;
  setBorrowingState: (state: BorrowingState) => void;
  setSelectedChord: (chord: Chord | null) => void;
  setPreviousPlayedChord: (chord: Chord | null) => void;
  setLastElementalPlayback: (
    resolution: ElementalPlaybackResolution | null
  ) => void;
  setActivePitches: (pitches: (number | null)[]) => void;
  setLastPlayedVoicingLabel: (label: string | null) => void;
  setLastPlayedBassLabel: (label: string | null) => void;
  setLastCommittedPlaybackTilt: (tilt: TiltSample) => void;
  setLastTapTilt: (tilt: TiltSample) => void;
  setSmoothBaseParallel: (value: number) => void;
}

/**
 * Composes dispatchAudio / updateVoiceLeadingBaseline / commitPlayback for
 * useChordPlayback. All refs and setters are owned by the caller.
 */
export function usePlaybackCommit({
  playStyleRef,
  tiltModeRef,
  activePitchesRef,
  previousChordRef,
  selectedChordNameRef,
  suppressNoTiltRevoiceRef,
  rawTiltRef,
  lastTapTiltRef,
  lastCommittedPlaybackTiltRef,
  smoothBaseParallelRef,
  lastNoTiltVoicingLevelRef,
  lastNoTiltPositionLevelRef,
  voiceLeadingModeRef,
  borrowingStateRef,
  setBorrowingState,
  setSelectedChord,
  setPreviousPlayedChord,
  setLastElementalPlayback,
  setActivePitches,
  setLastPlayedVoicingLabel,
  setLastPlayedBassLabel,
  setLastCommittedPlaybackTilt,
  setLastTapTilt,
  setSmoothBaseParallel,
}: UsePlaybackCommitOptions) {
  const dispatchAudio = useCallback(
    (pitches: number[], options: DispatchAudioOptions = {}) => {
      if (pitches.length === 0) return;

      const style = playStyleRef.current;
      const {
        retrigger = false,
        skipIfUnchanged = false,
        fromPointer = false,
        voicingDiff = false,
      } = options;

      if (
        !fromPointer &&
        (!isPageInteractiveForAudio() || audioEngine.isPageBackgrounded())
      ) {
        return;
      }

      // Voicing-diff must reach AudioEngine even when MIDI arrays match so
      // expired common tones can re-attack (Tilt to Strum contract).
      if (
        skipIfUnchanged &&
        !retrigger &&
        !voicingDiff &&
        pitchesEqual(pitches, activePitchesRef.current)
      ) {
        return;
      }

      if (voicingDiff) {
        audioEngine.updateVoicingDiff(pitches);
        return;
      }

      if (style === 'tap_and_hold') {
        if (fromPointer) {
          audioEngine.triggerAttack(pitches);
        } else {
          audioEngine.playNotes(pitches, '2n');
        }
        return;
      }

      // Callers set `retrigger` for same-button re-taps and for true chord-name
      // changes when Retrigger Sounding Notes is on. Same-chord revoices leave
      // it false so still-sounding notes can sustain.
      audioEngine.triggerAttack(pitches, retrigger);
    },
    [playStyleRef, activePitchesRef]
  );

  const updateVoiceLeadingBaseline = useCallback(
    (playbackTilt: TiltSample, deferSetState = false) => {
      lastCommittedPlaybackTiltRef.current = { ...playbackTilt };

      if (usesDeviceTilt(tiltModeRef.current)) {
        lastTapTiltRef.current = { ...rawTiltRef.current };
      } else {
        const { voicingLevel, positionLevel } =
          noTiltLevelsFromTilt(playbackTilt);
        lastNoTiltVoicingLevelRef.current = voicingLevel;
        lastNoTiltPositionLevelRef.current = positionLevel;
        lastTapTiltRef.current = playbackTilt;
      }

      if (commitsSmoothestParallelBaseline(voiceLeadingModeRef.current)) {
        const committedParallel = parallelLevelFromTilt(playbackTilt);
        smoothBaseParallelRef.current = committedParallel;
      }

      const applyReactSync = () => {
        setLastCommittedPlaybackTilt(lastCommittedPlaybackTiltRef.current);
        setLastTapTilt(lastTapTiltRef.current);
        if (commitsSmoothestParallelBaseline(voiceLeadingModeRef.current)) {
          setSmoothBaseParallel(smoothBaseParallelRef.current);
        }
      };

      if (deferSetState) {
        queueMicrotask(() => startTransition(applyReactSync));
      } else {
        startTransition(applyReactSync);
      }
    },
    [
      rawTiltRef,
      voiceLeadingModeRef,
      tiltModeRef,
      lastCommittedPlaybackTiltRef,
      lastTapTiltRef,
      lastNoTiltVoicingLevelRef,
      lastNoTiltPositionLevelRef,
      smoothBaseParallelRef,
      setLastCommittedPlaybackTilt,
      setLastTapTilt,
      setSmoothBaseParallel,
    ]
  );

  const commitPlayback = useCallback(
    (
      displayChord: Chord,
      pitches: number[],
      playbackTilt: TiltSample,
      state: BorrowingState,
      elemental: ElementalPlaybackResolution | undefined,
      options: CommitPlaybackOptions = {}
    ) => {
      const fromPointer = options.fromPointer ?? false;
      const voicingDiff = options.voicingDiff ?? false;

      dispatchAudio(pitches, options);

      const previousName = previousChordRef.current?.name;
      const pitchesChanged = !pitchesEqual(
        pitches,
        activePitchesRef.current,
      );
      previousChordRef.current = displayChord;
      activePitchesRef.current = pitches;
      // Sole writer for selectedChordNameRef (no selectedChord mirror effect).
      // Sync before any deferred no-tilt level setState flushes. Otherwise the
      // ChordContext re-voice effect can replay the previous chord.
      selectedChordNameRef.current = displayChord.name;

      if (fromPointer) {
        // Skip the re-voice effect once. Pointer commits change selectedChord,
        // which often recreates getBorrowingStateForChord and would re-enter
        // playAndDisplayChord without this guard (including first-chord paths
        // that do not queue a deferred level setState).
        armNoTiltRevoiceSuppress(suppressNoTiltRevoiceRef.current);
      }

      invalidateVoicingCacheForCommit(
        displayChord.name,
        state,
        voiceLeadingModeRef.current
      );
      updateVoiceLeadingBaseline(playbackTilt, fromPointer);

      const applyElementalState = () => {
        if (elemental) {
          setLastElementalPlayback(elemental);
        } else if (!isElementalName(displayChord.name)) {
          setLastElementalPlayback(null);
        }
      };

      if (options.borrowingStateOverride) {
        borrowingStateRef.current = options.borrowingStateOverride;
        setBorrowingState(options.borrowingStateOverride);
      }

      // Tilt to Strum: keep audio + refs hot; skip redundant chord identity
      // setState when the name is unchanged. Pitch/label React updates are
      // deferred (visual only); activePitchesRef remains authoritative for
      // audio / skip / revoice decisions.
      if (voicingDiff) {
        if (previousName !== displayChord.name) {
          setPreviousPlayedChord(displayChord);
          setSelectedChord(displayChord);
        }
        applyElementalState();
        if (pitchesChanged) {
          startTransition(() => {
            setActivePitches(pitches);
          });
        }
        if (pitches.length === 0) {
          return;
        }
        startTransition(() => {
          if (usesDeviceTilt(tiltModeRef.current)) {
            setLastPlayedVoicingLabel(lastPlayedVoicingReadout(playbackTilt));
            setLastPlayedBassLabel(
              lastPlayedBassReadout(playbackTilt, displayChord, {
                voicedPitches: pitches,
                borrowingState: state,
              }),
            );
          }
        });
        return;
      }

      // Chord identity and readout must stay sync after audio. Deferring them
      // via startTransition races with normal-priority level updates and can
      // leave the UI (and re-voice effect) stuck on the previous chord.
      setPreviousPlayedChord(displayChord);
      setSelectedChord(displayChord);
      applyElementalState();
      setActivePitches(pitches);

      // Empty mute shares selection/suppress/cache commit but must not rewrite
      // last-played tilt labels from parallel-from-tilt (no new sounded pitches).
      if (pitches.length === 0) {
        return;
      }

      const deferLabels = fromPointer;
      const applyTiltLabels = () => {
        if (usesDeviceTilt(tiltModeRef.current)) {
          setLastPlayedVoicingLabel(lastPlayedVoicingReadout(playbackTilt));
          setLastPlayedBassLabel(
            lastPlayedBassReadout(playbackTilt, displayChord, {
              voicedPitches: pitches,
              borrowingState: state,
            })
          );
        }
      };

      if (deferLabels) {
        queueMicrotask(() => startTransition(applyTiltLabels));
      } else {
        startTransition(applyTiltLabels);
      }
    },
    [
      borrowingStateRef,
      dispatchAudio,
      selectedChordNameRef,
      suppressNoTiltRevoiceRef,
      setBorrowingState,
      setSelectedChord,
      updateVoiceLeadingBaseline,
      voiceLeadingModeRef,
      previousChordRef,
      activePitchesRef,
      tiltModeRef,
      setPreviousPlayedChord,
      setLastElementalPlayback,
      setActivePitches,
      setLastPlayedVoicingLabel,
      setLastPlayedBassLabel,
    ]
  );

  return { dispatchAudio, updateVoiceLeadingBaseline, commitPlayback };
}
