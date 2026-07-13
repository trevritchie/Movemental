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
import type { PlayStyle, VoiceLeadingMode } from '../context/types';
import { commitsSmoothestParallelBaseline, usesDeviceTilt } from '../context/types';
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
      const tiltMode = tiltModeRef.current;
      const {
        retrigger = false,
        skipIfUnchanged = false,
        fromPointer = false,
      } = options;

      if (
        !fromPointer &&
        (!isPageInteractiveForAudio() || audioEngine.isPageBackgrounded())
      ) {
        return;
      }

      if (
        skipIfUnchanged &&
        !retrigger &&
        pitchesEqual(pitches, activePitchesRef.current)
      ) {
        return;
      }

      if (style === 'click_and_hold') {
        if (fromPointer) {
          audioEngine.triggerAttack(pitches);
        } else {
          audioEngine.playNotes(pitches, '2n');
        }
        return;
      }

      if (tiltMode) {
        audioEngine.triggerAttack(pitches, retrigger);
        return;
      }

      audioEngine.triggerAttack(pitches, retrigger);
    },
    [playStyleRef, tiltModeRef, activePitchesRef]
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
      dispatchAudio(pitches, options);

      previousChordRef.current = displayChord;
      activePitchesRef.current = pitches;
      // Sole writer for selectedChordNameRef (no selectedChord mirror effect).
      // Sync before any deferred no-tilt level setState flushes. Otherwise the
      // ChordContext re-voice effect can replay the previous chord.
      selectedChordNameRef.current = displayChord.name;

      const fromPointer = options.fromPointer ?? false;
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

      // Chord identity and readout must stay sync after audio. Deferring them
      // via startTransition races with normal-priority level updates and can
      // leave the UI (and re-voice effect) stuck on the previous chord.
      setPreviousPlayedChord(displayChord);
      setSelectedChord(displayChord);
      if (elemental) {
        setLastElementalPlayback(elemental);
      } else if (!isElementalName(displayChord.name)) {
        setLastElementalPlayback(null);
      }
      setActivePitches(pitches);
      if (options.borrowingStateOverride) {
        borrowingStateRef.current = options.borrowingStateOverride;
        setBorrowingState(options.borrowingStateOverride);
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
