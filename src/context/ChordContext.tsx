/* eslint-disable react-refresh/only-export-components */
/**
 * Application-wide chord, playback, borrowing, and session wiring.
 *
 * Wires useBorrowingMemory, useDeviceTilt, useChordPlayback,
 * useSettingsReset, and useAudioSettings into one provider. Sound design
 * and live tilt readout live in their dedicated hooks; this provider
 * composes them. playAndDisplayChordRef breaks a hook ordering cycle
 * between borrowing memory and playback.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import { chordManager, type Chord } from '../music/ChordManager';
import type { BorrowingState } from '../music/BorrowingLogic';
import {
  DEFAULT_NO_TILT_POSITION_LEVEL,
  DEFAULT_NO_TILT_VOICING_LEVEL,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import { useAudioSettings } from '../hooks/useAudioSettings';
import { useAudioLifecycle } from '../hooks/useAudioLifecycle';
import { useBorrowingMemory } from '../hooks/useBorrowingMemory';
import { useChordPlayback } from '../hooks/useChordPlayback';
import { useDeviceTilt } from '../hooks/useDeviceTilt';
import { usePersistedUserSettings } from '../hooks/usePersistedUserSettings';
import { useSettingsReset } from '../hooks/useSettingsReset';
import { TiltReadoutProvider } from './TiltReadoutContext';
import { SoundDesignContext } from './SoundDesignContext';
import { useNoTiltChordLocks } from '../hooks/useNoTiltChordLocks';
import type { ElementalPlaybackResolution } from '../music/tiltVoicingPlayback';
import {
  consumeNoTiltRevoiceSuppress,
  createNoTiltRevoiceSuppressState,
} from '../music/noTiltRevoiceSuppress';
import type {
  ClockLayoutMode,
  DiagramLayoutMode,
  PlayStyle,
  VoiceLeadingMode,
  VoicingElevatorFloorsMode,
} from '../music/sessionModes';
import { isChordEnabledInLayout } from '../music/diagramLayouts';
import { loadUserSettings } from '../settings/userSettingsStorage';
import {
  type SettingsSectionId,
  type ShortestNote,
} from '../settings/userSettingsSchema';
import type { SettingsResetGroupId } from '../settings/settingsResetGroups';
import { useLayoutTier } from '../hooks/useLayoutTier';
import { resolveDefaultHarmonicFunctionLabelsEnabled } from '../diagram/diagramScaling';
import {
  allowedVoicingLevels,
  snapVoicingLevelToAllowed,
} from '../music/voicingElevatorFloors';

export type {
  ClockLayoutMode,
  DiagramLayoutMode,
  PlayStyle,
  VoiceLeadingMode,
  VoicingElevatorFloorsMode,
} from '../music/sessionModes';

interface ChordContextType {
  tonalCenter: number;
  setTonalCenter: (val: number) => void;
  noTiltVoicingLevel: number;
  setNoTiltVoicingLevel: (val: number) => void;
  noTiltPositionLevel: number;
  setNoTiltPositionLevel: (val: number) => void;
  octaveRange: number;
  setOctaveRange: (val: number) => void;
  selectedChord: Chord | null;
  borrowingState: BorrowingState;
  activePitches: (number | null)[];
  previousPlayedChord: Chord | null;
  handleChordSelect: (chord: Chord) => void;
  handleBorrowingStateChange: (newState: BorrowingState) => void;
  playStyle: PlayStyle;
  setPlayStyle: (mode: PlayStyle) => void;
  tiltModeEnabled: boolean;
  enterTiltSession: () => void;
  enterNoTiltSession: () => void;
  handleChordPointerDown: (chord: Chord) => void;
  handleChordPointerUp: () => void;
  handleChordPointerEnter: (chord: Chord) => void;
  borrowingMemory: 'global' | 'per-chord';
  setBorrowingMemory: (mode: 'global' | 'per-chord') => void;
  voiceLeadingMode: VoiceLeadingMode;
  setVoiceLeadingMode: (mode: VoiceLeadingMode) => void;
  voicingElevatorFloorsMode: VoicingElevatorFloorsMode;
  setVoicingElevatorFloorsMode: (mode: VoicingElevatorFloorsMode) => void;
  clockLayoutMode: ClockLayoutMode;
  setClockLayoutMode: (mode: ClockLayoutMode) => void;
  glowingOrbsEnabled: boolean;
  setGlowingOrbsEnabled: (enabled: boolean) => void;
  harmonicFunctionLabelsEnabled: boolean;
  setHarmonicFunctionLabelsEnabled: (enabled: boolean) => void;
  diagramLayoutMode: DiagramLayoutMode;
  setDiagramLayoutMode: (mode: DiagramLayoutMode) => void;
  retriggerSoundingNotes: boolean;
  setRetriggerSoundingNotes: (enabled: boolean) => void;
  tiltToStrum: boolean;
  setTiltToStrum: (enabled: boolean) => void;
  shortestNote: ShortestNote;
  setShortestNote: (note: ShortestNote) => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  lastTapTilt: TiltSample;
  lastCommittedPlaybackTilt: TiltSample;
  smoothBaseParallel: number;
  lastPlayedVoicingLabel: string | null;
  lastPlayedBassLabel: string | null;
  lastElementalPlayback: ElementalPlaybackResolution | null;
  isNoTiltVoicingLocked: boolean;
  isNoTiltBassLocked: boolean;
  toggleNoTiltVoicingLock: () => void;
  toggleNoTiltBassLock: () => void;
  resetSettingsSection: (sectionId: SettingsSectionId) => void;
  resetSettingsGroup: (groupId: SettingsResetGroupId) => void;
  resetAllSettings: () => void;
  /** Panic switch: silence notes and clear selection (disarms tilt-strum). */
  panicStop: () => void;
}

const ChordContext = createContext<ChordContextType | undefined>(undefined);

export const useChordContext = () => {
  const context = useContext(ChordContext);
  if (!context) {
    throw new Error('useChordContext must be used within a ChordProvider');
  }
  return context;
};

interface ChordProviderProps {
  children: ReactNode;
}

export const ChordProvider: React.FC<ChordProviderProps> = ({ children }) => {
  const {
    settings: loadedSettings,
    hasPersistedSettings,
    hasHarmonicFunctionLabelsSetting,
  } = useMemo(() => loadUserSettings(), []);
  const layoutTier = useLayoutTier();

  const [tonalCenter, setTonalCenter] = useState(
    loadedSettings.general.tonalCenter
  );
  const [noTiltVoicingLevel, setNoTiltVoicingLevel] = useState(
    DEFAULT_NO_TILT_VOICING_LEVEL
  );
  const [noTiltPositionLevel, setNoTiltPositionLevel] = useState(
    DEFAULT_NO_TILT_POSITION_LEVEL
  );
  const [octaveRange, setOctaveRange] = useState(
    loadedSettings.general.octaveRange
  );
  const [selectedChord, setSelectedChord] = useState<Chord | null>(null);
  const [voiceLeadingMode, setVoiceLeadingMode] = useState<VoiceLeadingMode>(
    loadedSettings.voiceLeading.mode
  );
  const [voicingElevatorFloorsMode, setVoicingElevatorFloorsMode] =
    useState<VoicingElevatorFloorsMode>(
      loadedSettings.voicingElevatorFloors.floorsMode,
    );
  const [clockLayoutMode, setClockLayoutMode] = useState<ClockLayoutMode>(
    loadedSettings.clockFace.layoutMode
  );
  const [glowingOrbsEnabled, setGlowingOrbsEnabled] = useState(
    loadedSettings.glowingOrbs.enabled
  );
  const [harmonicFunctionLabelsEnabled, setHarmonicFunctionLabelsEnabled] =
    useState(() => {
      if (!hasHarmonicFunctionLabelsSetting) {
        return resolveDefaultHarmonicFunctionLabelsEnabled(
          layoutTier,
          window.innerWidth,
          window.innerHeight,
        );
      }
      return loadedSettings.harmonicFunctionLabels.enabled;
    });
  const [diagramLayoutMode, setDiagramLayoutModeState] = useState<
    DiagramLayoutMode
  >(loadedSettings.diagramLayout.diagramMode);
  const [retriggerSoundingNotes, setRetriggerSoundingNotes] = useState(
    loadedSettings.general.retriggerSoundingNotes
  );
  const retriggerSoundingNotesRef = useRef(retriggerSoundingNotes);
  useEffect(() => {
    retriggerSoundingNotesRef.current = retriggerSoundingNotes;
  }, [retriggerSoundingNotes]);

  const [tiltToStrum, setTiltToStrum] = useState(
    loadedSettings.general.tiltToStrum
  );
  const tiltToStrumRef = useRef(tiltToStrum);
  useEffect(() => {
    tiltToStrumRef.current = tiltToStrum;
  }, [tiltToStrum]);

  const [shortestNote, setShortestNote] = useState(
    loadedSettings.general.shortestNote
  );
  const shortestNoteRef = useRef(shortestNote);
  useEffect(() => {
    shortestNoteRef.current = shortestNote;
  }, [shortestNote]);

  const [bpm, setBpm] = useState(loadedSettings.general.bpm);
  const bpmRef = useRef(bpm);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const selectedChordNameRef = useRef<string | null>(null);
  /** Armed by pointer commits / deferred level flushes; consumed by re-voice. */
  const suppressNoTiltRevoiceRef = useRef(createNoTiltRevoiceSuppressState());
  const tiltStrumSampleRef = useRef<() => void>(() => {});

  const playAndDisplayChordRef = useRef<
    (chord: Chord, state: BorrowingState) => void
  >(() => {});

  const deviceTilt = useDeviceTilt({
    onRawTiltUpdate: () => {
      tiltStrumSampleRef.current();
    },
  });
  const borrowing = useBorrowingMemory({
    selectedChord,
    playAndDisplayChord: (chord, state) =>
      playAndDisplayChordRef.current(chord, state),
    initialBorrowingMemory: loadedSettings.voiceBorrowing.memory,
  });

  const noTiltVoicingLevelRef = useRef(noTiltVoicingLevel);
  const noTiltPositionLevelRef = useRef(noTiltPositionLevel);
  const tonalCenterRef = useRef(tonalCenter);
  const voiceLeadingModeRef = useRef(voiceLeadingMode);
  const voicingElevatorFloorsModeRef = useRef(voicingElevatorFloorsMode);
  useEffect(() => {
    noTiltVoicingLevelRef.current = noTiltVoicingLevel;
  }, [noTiltVoicingLevel]);
  useEffect(() => {
    noTiltPositionLevelRef.current = noTiltPositionLevel;
  }, [noTiltPositionLevel]);
  useEffect(() => {
    tonalCenterRef.current = tonalCenter;
  }, [tonalCenter]);
  useEffect(() => {
    voiceLeadingModeRef.current = voiceLeadingMode;
  }, [voiceLeadingMode]);
  useEffect(() => {
    voicingElevatorFloorsModeRef.current = voicingElevatorFloorsMode;
  }, [voicingElevatorFloorsMode]);

  const setNoTiltVoicingLevelSnapped = useCallback(
    (level: number) => {
      const allowed = allowedVoicingLevels(
        voicingElevatorFloorsModeRef.current,
        selectedChordNameRef.current,
      );
      setNoTiltVoicingLevel(snapVoicingLevelToAllowed(level, allowed));
    },
    [],
  );

  const setVoicingElevatorFloorsModeSafe = useCallback(
    (mode: VoicingElevatorFloorsMode) => {
      setVoicingElevatorFloorsMode(mode);
      voicingElevatorFloorsModeRef.current = mode;
      const allowed = allowedVoicingLevels(
        mode,
        selectedChordNameRef.current,
      );
      const snapped = snapVoicingLevelToAllowed(
        noTiltVoicingLevelRef.current,
        allowed,
      );
      noTiltVoicingLevelRef.current = snapped;
      setNoTiltVoicingLevel(snapped);
    },
    [],
  );

  const noTiltLocks = useNoTiltChordLocks({
    selectedChord,
    setNoTiltVoicingLevel: setNoTiltVoicingLevelSnapped,
    setNoTiltPositionLevel,
    noTiltVoicingLevelRef,
    noTiltPositionLevelRef,
    suppressNoTiltRevoiceRef,
  });

  const applyNoTiltLocksForChord = useCallback(
    (chordName: string, deferSetState?: boolean) => {
      noTiltLocks.applyLocksForChord(chordName, deferSetState);
      const allowed = allowedVoicingLevels(
        voicingElevatorFloorsModeRef.current,
        chordName,
      );
      const snapped = snapVoicingLevelToAllowed(
        noTiltVoicingLevelRef.current,
        allowed,
      );
      if (snapped === noTiltVoicingLevelRef.current) {
        return;
      }
      noTiltVoicingLevelRef.current = snapped;
      if (deferSetState) {
        queueMicrotask(() => {
          setNoTiltVoicingLevel(snapped);
        });
      } else {
        setNoTiltVoicingLevel(snapped);
      }
    },
    [noTiltLocks],
  );

  const playback = useChordPlayback({
    getBorrowingStateForChord: borrowing.getBorrowingStateForChord,
    borrowingStateRef: borrowing.borrowingStateRef,
    setBorrowingState: borrowing.setBorrowingState,
    setSelectedChord,
    selectedChordNameRef,
    suppressNoTiltRevoiceRef,
    rawTiltRef: deviceTilt.rawTiltRef,
    noTiltVoicingLevelRef,
    noTiltPositionLevelRef,
    tonalCenterRef,
    voiceLeadingModeRef,
    voicingElevatorFloorsModeRef,
    setNoTiltPositionLevel,
    noTiltLockMapsRef: noTiltLocks.lockMapsRef,
    applyNoTiltLocksForChord,
    clearNoTiltChordLocks: noTiltLocks.clearAllLocks,
    initialPlayStyle: loadedSettings.general.playStyle,
    hasPersistedSettings,
    retriggerSoundingNotesRef,
    tiltToStrumRef,
    shortestNoteRef,
    bpmRef,
  });

  useAudioLifecycle();

  useEffect(() => {
    playAndDisplayChordRef.current = playback.playAndDisplayChord;
  }, [playback.playAndDisplayChord]);

  useEffect(() => {
    tiltStrumSampleRef.current = playback.handleTiltStrumSample;
  }, [playback.handleTiltStrumSample]);

  const getBorrowingStateForChordRef = useRef(borrowing.getBorrowingStateForChord);
  useEffect(() => {
    getBorrowingStateForChordRef.current = borrowing.getBorrowingStateForChord;
  }, [borrowing.getBorrowingStateForChord]);

  const setBorrowingStateRef = useRef(borrowing.setBorrowingState);
  useEffect(() => {
    setBorrowingStateRef.current = borrowing.setBorrowingState;
  }, [borrowing.setBorrowingState]);

  const audio = useAudioSettings(
    playback.playStyle,
    loadedSettings.soundDesign,
    hasPersistedSettings
  );

  const {
    getBorrowingStateForChord,
    borrowingStateRef,
    setBorrowingState,
    clearChordBorrowingStates,
  } = borrowing;
  const {
    playAndDisplayChord,
    enterTiltSession: enterTiltPlayback,
    enterNoTiltSession: enterNoTiltPlayback,
    resetVoiceLeadingSession,
    clearPlaybackSelection,
  } = playback;
  const panicStop = clearPlaybackSelection;
  const { synthPresetId, setSynthPresetId } = audio;

  const enterTiltSession = useCallback(() => {
    enterTiltPlayback();
    if (!hasPersistedSettings) {
      setVoiceLeadingMode('smooth');
    }
  }, [enterTiltPlayback, hasPersistedSettings]);

  const enterNoTiltSession = useCallback(() => {
    enterNoTiltPlayback();
    if (!hasPersistedSettings) {
      setVoiceLeadingMode('smoothest');
    }
  }, [enterNoTiltPlayback, hasPersistedSettings]);

  const setDiagramLayoutMode = useCallback(
    (mode: DiagramLayoutMode) => {
      setDiagramLayoutModeState(mode);
      const currentName = selectedChordNameRef.current;
      if (currentName && !isChordEnabledInLayout(currentName, mode)) {
        clearPlaybackSelection();
      }
    },
    [clearPlaybackSelection],
  );

  const {
    resetSettingsSection,
    resetSettingsGroup,
    resetAllSettings,
  } = useSettingsReset({
    tiltModeEnabled: playback.tiltModeEnabled,
    layoutTier,
    synthPresetId,
    setTonalCenter,
    setOctaveRange,
    setPlayStyle: playback.setPlayStyle,
    setVoiceLeadingMode,
    setBorrowingMemory: borrowing.setBorrowingMemory,
    setClockLayoutMode,
    setVoicingElevatorFloorsMode: setVoicingElevatorFloorsModeSafe,
    setGlowingOrbsEnabled,
    setHarmonicFunctionLabelsEnabled,
    setDiagramLayoutMode,
    setRetriggerSoundingNotes,
    setTiltToStrum,
    setShortestNote,
    setBpm,
    setSynthPresetId,
    setEqProfileId: audio.setEqProfileId,
    setChorusWet: audio.setChorusWet,
    setDelayWet: audio.setDelayWet,
    setReverbWet: audio.setReverbWet,
    setEnvelopeAttack: audio.setEnvelopeAttack,
    setEnvelopeDecay: audio.setEnvelopeDecay,
    setEnvelopeSustain: audio.setEnvelopeSustain,
    setEnvelopeRelease: audio.setEnvelopeRelease,
    setTapAttack: audio.setTapAttack,
    setTapDecay: audio.setTapDecay,
    setTapSustain: audio.setTapSustain,
    setTapRelease: audio.setTapRelease,
    resetVoiceLeadingSession,
    clearChordBorrowingStates,
  });

  const settingsSnapshot = useMemo(
    () => ({
      general: {
        tonalCenter,
        octaveRange,
        playStyle: playback.playStyle,
        retriggerSoundingNotes,
        tiltToStrum,
        shortestNote,
        bpm,
      },
      voiceLeading: { mode: voiceLeadingMode },
      voicingElevatorFloors: { floorsMode: voicingElevatorFloorsMode },
      voiceBorrowing: { memory: borrowing.borrowingMemory },
      clockFace: { layoutMode: clockLayoutMode },
      glowingOrbs: { enabled: glowingOrbsEnabled },
      harmonicFunctionLabels: { enabled: harmonicFunctionLabelsEnabled },
      diagramLayout: { diagramMode: diagramLayoutMode },
      soundDesign: {
        synthPresetId: audio.synthPresetId,
        eqProfileId: audio.eqProfileId,
        chorusWet: audio.chorusWet,
        delayWet: audio.delayWet,
        reverbWet: audio.reverbWet,
        envelopeAttack: audio.envelopeAttack,
        envelopeDecay: audio.envelopeDecay,
        envelopeSustain: audio.envelopeSustain,
        envelopeRelease: audio.envelopeRelease,
        tapAttack: audio.tapAttack,
        tapDecay: audio.tapDecay,
        tapSustain: audio.tapSustain,
        tapRelease: audio.tapRelease,
      },
    }),
    [
      tonalCenter,
      octaveRange,
      playback.playStyle,
      retriggerSoundingNotes,
      tiltToStrum,
      shortestNote,
      bpm,
      voiceLeadingMode,
      voicingElevatorFloorsMode,
      borrowing.borrowingMemory,
      clockLayoutMode,
      glowingOrbsEnabled,
      harmonicFunctionLabelsEnabled,
      diagramLayoutMode,
      audio.synthPresetId,
      audio.eqProfileId,
      audio.chorusWet,
      audio.delayWet,
      audio.reverbWet,
      audio.envelopeAttack,
      audio.envelopeDecay,
      audio.envelopeSustain,
      audio.envelopeRelease,
      audio.tapAttack,
      audio.tapDecay,
      audio.tapSustain,
      audio.tapRelease,
    ]
  );

  usePersistedUserSettings(settingsSnapshot);

  const handleChordSelect = useCallback(
    (chord: Chord) => {
      if (!isChordEnabledInLayout(chord.name, diagramLayoutMode)) return;
      setSelectedChord(chord);
      const newState = getBorrowingStateForChord(
        chord.name,
        borrowingStateRef.current
      );
      setBorrowingState(newState);
      playAndDisplayChord(chord, newState);
    },
    [
      diagramLayoutMode,
      getBorrowingStateForChord,
      borrowingStateRef,
      setBorrowingState,
      playAndDisplayChord,
    ]
  );

  const handleChordPointerDown = useCallback(
    (chord: Chord) => {
      if (!isChordEnabledInLayout(chord.name, diagramLayoutMode)) return;
      playback.handleChordPointerDown(chord);
    },
    [diagramLayoutMode, playback.handleChordPointerDown],
  );

  const handleChordPointerEnter = useCallback(
    (chord: Chord) => {
      if (!isChordEnabledInLayout(chord.name, diagramLayoutMode)) return;
      playback.handleChordPointerEnter(chord);
    },
    [diagramLayoutMode, playback.handleChordPointerEnter],
  );

  useEffect(() => {
    chordManager.configureTonalSpace(tonalCenter, octaveRange);
  }, [tonalCenter, octaveRange]);

  /**
   * Re-voice the selected chord when global register or no-tilt voicing
   * controls change. Skips redundant audio when pitches are unchanged
   * (playAndDisplayChord -> skipIfUnchanged). Does not run on every tilt
   * tick; tilt voicing is sampled at tap time only.
   *
   * selectedChordNameRef is written only by commitPlayback (not mirrored from
   * selectedChord) so deferred level flushes cannot re-voice a stale name.
   *
   * Callback deps are read via refs so identity churn cannot loop this effect.
   */
  useEffect(() => {
    if (consumeNoTiltRevoiceSuppress(suppressNoTiltRevoiceRef.current)) {
      return;
    }

    const name = selectedChordNameRef.current;
    if (!name) return;

    const updatedChord = chordManager.getChordByName(name);
    if (!updatedChord) return;

    setSelectedChord(updatedChord);
    const newState = getBorrowingStateForChordRef.current(
      name,
      borrowing.borrowingStateRef.current
    );
    setBorrowingStateRef.current(newState);
    playAndDisplayChordRef.current(updatedChord, newState);
  }, [
    tonalCenter,
    octaveRange,
    noTiltVoicingLevel,
    noTiltPositionLevel,
    voiceLeadingMode,
    // borrowingStateRef is a stable ref object (identity never changes), so
    // including it here does not cause this effect to re-run on borrowing
    // changes. It is listed only to satisfy exhaustive-deps.
    borrowing.borrowingStateRef,
  ]);

  const value: ChordContextType = useMemo(
    () => ({
      tonalCenter,
      setTonalCenter,
      noTiltVoicingLevel,
      setNoTiltVoicingLevel: noTiltLocks.setNoTiltVoicingLevel,
      noTiltPositionLevel,
      setNoTiltPositionLevel: noTiltLocks.setNoTiltPositionLevel,
      octaveRange,
      setOctaveRange,
      selectedChord,
      borrowingState: borrowing.borrowingState,
      activePitches: playback.activePitches,
      previousPlayedChord: playback.previousPlayedChord,
      handleChordSelect,
      handleBorrowingStateChange: borrowing.handleBorrowingStateChange,
      playStyle: playback.playStyle,
      setPlayStyle: playback.setPlayStyle,
      tiltModeEnabled: playback.tiltModeEnabled,
      enterTiltSession,
      enterNoTiltSession,
      handleChordPointerDown: handleChordPointerDown,
      handleChordPointerUp: playback.handleChordPointerUp,
      handleChordPointerEnter: handleChordPointerEnter,
      borrowingMemory: borrowing.borrowingMemory,
      setBorrowingMemory: borrowing.setBorrowingMemory,
      voiceLeadingMode,
      setVoiceLeadingMode,
      voicingElevatorFloorsMode,
      setVoicingElevatorFloorsMode: setVoicingElevatorFloorsModeSafe,
      clockLayoutMode,
      setClockLayoutMode,
      glowingOrbsEnabled,
      setGlowingOrbsEnabled,
      harmonicFunctionLabelsEnabled,
      setHarmonicFunctionLabelsEnabled,
      diagramLayoutMode,
      setDiagramLayoutMode,
      retriggerSoundingNotes,
      setRetriggerSoundingNotes,
      tiltToStrum,
      setTiltToStrum,
      shortestNote,
      setShortestNote,
      bpm,
      setBpm,
      lastTapTilt: playback.lastTapTilt,
      lastCommittedPlaybackTilt: playback.lastCommittedPlaybackTilt,
      smoothBaseParallel: playback.smoothBaseParallel,
      lastPlayedVoicingLabel: playback.lastPlayedVoicingLabel,
      lastPlayedBassLabel: playback.lastPlayedBassLabel,
      lastElementalPlayback: playback.lastElementalPlayback,
      isNoTiltVoicingLocked: noTiltLocks.isVoicingLocked,
      isNoTiltBassLocked: noTiltLocks.isBassLocked,
      toggleNoTiltVoicingLock: noTiltLocks.toggleVoicingLock,
      toggleNoTiltBassLock: noTiltLocks.toggleBassLock,
      resetSettingsSection,
      resetSettingsGroup,
      resetAllSettings,
      panicStop,
    }),
    [
      tonalCenter,
      noTiltVoicingLevel,
      noTiltPositionLevel,
      octaveRange,
      selectedChord,
      borrowing.borrowingState,
      borrowing.handleBorrowingStateChange,
      borrowing.borrowingMemory,
      borrowing.setBorrowingMemory,
      playback.activePitches,
      playback.previousPlayedChord,
      playback.playStyle,
      playback.setPlayStyle,
      playback.tiltModeEnabled,
      enterTiltSession,
      enterNoTiltSession,
      handleChordPointerDown,
      handleChordPointerEnter,
      playback.handleChordPointerUp,
      handleChordSelect,
      voiceLeadingMode,
      voicingElevatorFloorsMode,
      setVoicingElevatorFloorsModeSafe,
      clockLayoutMode,
      glowingOrbsEnabled,
      harmonicFunctionLabelsEnabled,
      diagramLayoutMode,
      setDiagramLayoutMode,
      retriggerSoundingNotes,
      tiltToStrum,
      shortestNote,
      bpm,
      playback.lastTapTilt,
      playback.lastCommittedPlaybackTilt,
      playback.smoothBaseParallel,
      playback.lastPlayedVoicingLabel,
      playback.lastPlayedBassLabel,
      playback.lastElementalPlayback,
      noTiltLocks.isVoicingLocked,
      noTiltLocks.isBassLocked,
      noTiltLocks.toggleVoicingLock,
      noTiltLocks.toggleBassLock,
      noTiltLocks.setNoTiltVoicingLevel,
      noTiltLocks.setNoTiltPositionLevel,
      resetSettingsSection,
      resetSettingsGroup,
      resetAllSettings,
      panicStop,
    ]
  );

  const soundDesignValue = useMemo(
    () => ({
      chorusWet: audio.chorusWet,
      setChorusWet: audio.setChorusWet,
      delayWet: audio.delayWet,
      setDelayWet: audio.setDelayWet,
      reverbWet: audio.reverbWet,
      setReverbWet: audio.setReverbWet,
      eqProfileId: audio.eqProfileId,
      setEqProfileId: audio.setEqProfileId,
      synthPresetId: audio.synthPresetId,
      setSynthPresetId: audio.setSynthPresetId,
      synthPresetLoading: audio.synthPresetLoading,
      isSamplerInstrumentActive: audio.isSamplerInstrumentActive,
      isSamplerAdsrDisabled: audio.isSamplerAdsrDisabled,
      synthPresets: audio.synthPresets,
      envelopeAttack: audio.envelopeAttack,
      setEnvelopeAttack: audio.setEnvelopeAttack,
      envelopeDecay: audio.envelopeDecay,
      setEnvelopeDecay: audio.setEnvelopeDecay,
      envelopeSustain: audio.envelopeSustain,
      setEnvelopeSustain: audio.setEnvelopeSustain,
      envelopeRelease: audio.envelopeRelease,
      setEnvelopeRelease: audio.setEnvelopeRelease,
      tapAttack: audio.tapAttack,
      setTapAttack: audio.setTapAttack,
      tapDecay: audio.tapDecay,
      setTapDecay: audio.setTapDecay,
      tapSustain: audio.tapSustain,
      setTapSustain: audio.setTapSustain,
      tapRelease: audio.tapRelease,
      setTapRelease: audio.setTapRelease,
    }),
    [
      audio.chorusWet,
      audio.setChorusWet,
      audio.delayWet,
      audio.setDelayWet,
      audio.reverbWet,
      audio.setReverbWet,
      audio.eqProfileId,
      audio.setEqProfileId,
      audio.synthPresetId,
      audio.setSynthPresetId,
      audio.synthPresetLoading,
      audio.isSamplerInstrumentActive,
      audio.isSamplerAdsrDisabled,
      audio.synthPresets,
      audio.envelopeAttack,
      audio.setEnvelopeAttack,
      audio.envelopeDecay,
      audio.setEnvelopeDecay,
      audio.envelopeSustain,
      audio.setEnvelopeSustain,
      audio.envelopeRelease,
      audio.setEnvelopeRelease,
      audio.tapAttack,
      audio.setTapAttack,
      audio.tapDecay,
      audio.setTapDecay,
      audio.tapSustain,
      audio.setTapSustain,
      audio.tapRelease,
      audio.setTapRelease,
    ],
  );

  return (
    <TiltReadoutProvider
      status={deviceTilt.status}
      tilt={deviceTilt.tilt}
      orientationRef={deviceTilt.orientationRef}
      requestPermission={deviceTilt.requestPermission}
    >
      <ChordContext.Provider value={value}>
        <SoundDesignContext.Provider value={soundDesignValue}>
          {children}
        </SoundDesignContext.Provider>
      </ChordContext.Provider>
    </TiltReadoutProvider>
  );
};
