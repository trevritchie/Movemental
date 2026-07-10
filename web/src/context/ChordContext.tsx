/* eslint-disable react-refresh/only-export-components */
/**
 * Application-wide chord, playback, borrowing, audio FX, and tilt state.
 *
 * Wires useBorrowingMemory, useDeviceTilt, useChordPlayback, and
 * useAudioSettings into one provider. playAndDisplayChordRef breaks a hook
 * ordering cycle between borrowing memory and playback.
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
import { useBorrowingMemory } from '../hooks/useBorrowingMemory';
import { useChordPlayback } from '../hooks/useChordPlayback';
import { useDeviceTilt } from '../hooks/useDeviceTilt';
import { usePersistedUserSettings } from '../hooks/usePersistedUserSettings';
import { TiltReadoutProvider } from './TiltReadoutContext';
import { useNoTiltChordLocks } from '../hooks/useNoTiltChordLocks';
import type { ElementalPlaybackResolution } from '../music/tiltVoicingPlayback';
import type { EqProfileId } from '../audio/outputProfiles';
import type { SynthPreset } from '../audio/synthPresets';
import type { PlayStyle, VoiceLeadingMode } from './types';
import { loadUserSettings, clearUserSettings } from '../settings/userSettingsStorage';
import {
  getDefaultVoiceLeadingMode,
  getSectionDefaults,
  SETTINGS_SECTION_IDS,
  type SettingsSectionId,
  type SettingKey,
} from '../settings/userSettingsSchema';

export type { PlayStyle, VoiceLeadingMode } from './types';

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
  chorusWet: number;
  setChorusWet: (val: number) => void;
  delayWet: number;
  setDelayWet: (val: number) => void;
  reverbWet: number;
  setReverbWet: (val: number) => void;
  eqProfileId: EqProfileId;
  setEqProfileId: (id: EqProfileId) => void;
  synthPresetId: string;
  setSynthPresetId: (id: string) => void;
  synthPresetLoading: boolean;
  isSamplerInstrumentActive: boolean;
  isSamplerAdsrDisabled: boolean;
  synthPresets: SynthPreset[];
  playStyle: PlayStyle;
  setPlayStyle: (mode: PlayStyle) => void;
  tiltModeEnabled: boolean;
  enterTiltSession: () => void;
  enterNoTiltSession: () => void;
  handleChordPointerDown: (chord: Chord) => void;
  handleChordPointerUp: () => void;
  handleChordPointerEnter: (chord: Chord) => void;
  envelopeAttack: number;
  setEnvelopeAttack: (val: number) => void;
  envelopeDecay: number;
  setEnvelopeDecay: (val: number) => void;
  envelopeSustain: number;
  setEnvelopeSustain: (val: number) => void;
  envelopeRelease: number;
  setEnvelopeRelease: (val: number) => void;
  droneAttack: number;
  setDroneAttack: (val: number) => void;
  droneDecay: number;
  setDroneDecay: (val: number) => void;
  droneSustain: number;
  setDroneSustain: (val: number) => void;
  droneRelease: number;
  setDroneRelease: (val: number) => void;
  borrowingMemory: 'global' | 'per-chord';
  setBorrowingMemory: (mode: 'global' | 'per-chord') => void;
  voiceLeadingMode: VoiceLeadingMode;
  setVoiceLeadingMode: (mode: VoiceLeadingMode) => void;
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
  resetAllSettings: () => void;
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
  const { settings: loadedSettings, hasPersistedSettings } = useMemo(
    () => loadUserSettings(),
    []
  );

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

  const selectedChordNameRef = useRef<string | null>(null);
  useEffect(() => {
    selectedChordNameRef.current = selectedChord?.name ?? null;
  }, [selectedChord]);

  const playAndDisplayChordRef = useRef<
    (chord: Chord, state: BorrowingState) => void
  >(() => {});

  const borrowing = useBorrowingMemory({
    selectedChord,
    playAndDisplayChord: (chord, state) =>
      playAndDisplayChordRef.current(chord, state),
    initialBorrowingMemory: loadedSettings.voiceBorrowing.memory,
  });

  const deviceTilt = useDeviceTilt();

  const noTiltVoicingLevelRef = useRef(noTiltVoicingLevel);
  const noTiltPositionLevelRef = useRef(noTiltPositionLevel);
  const tonalCenterRef = useRef(tonalCenter);
  const voiceLeadingModeRef = useRef(voiceLeadingMode);
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

  const noTiltLocks = useNoTiltChordLocks({
    selectedChord,
    setNoTiltVoicingLevel,
    setNoTiltPositionLevel,
    noTiltVoicingLevelRef,
    noTiltPositionLevelRef,
  });

  const playback = useChordPlayback({
    getBorrowingStateForChord: borrowing.getBorrowingStateForChord,
    borrowingStateRef: borrowing.borrowingStateRef,
    setBorrowingState: borrowing.setBorrowingState,
    setSelectedChord,
    rawTiltRef: deviceTilt.rawTiltRef,
    noTiltVoicingLevelRef,
    noTiltPositionLevelRef,
    tonalCenterRef,
    voiceLeadingModeRef,
    setNoTiltPositionLevel,
    noTiltLockMapsRef: noTiltLocks.lockMapsRef,
    applyNoTiltLocksForChord: noTiltLocks.applyLocksForChord,
    clearNoTiltChordLocks: noTiltLocks.clearAllLocks,
    initialPlayStyle: loadedSettings.general.playStyle,
    hasPersistedSettings,
  });

  useEffect(() => {
    playAndDisplayChordRef.current = playback.playAndDisplayChord;
  }, [playback.playAndDisplayChord]);

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
  } = playback;

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

  const applySetting = useMemo(
    () =>
      ({
        tonalCenter: setTonalCenter,
        octaveRange: setOctaveRange,
        playStyle: playback.setPlayStyle,
        mode: setVoiceLeadingMode,
        memory: borrowing.setBorrowingMemory,
        synthPresetId: audio.setSynthPresetId,
        eqProfileId: audio.setEqProfileId,
        chorusWet: audio.setChorusWet,
        delayWet: audio.setDelayWet,
        reverbWet: audio.setReverbWet,
        envelopeAttack: audio.setEnvelopeAttack,
        envelopeDecay: audio.setEnvelopeDecay,
        envelopeSustain: audio.setEnvelopeSustain,
        envelopeRelease: audio.setEnvelopeRelease,
        droneAttack: audio.setDroneAttack,
        droneDecay: audio.setDroneDecay,
        droneSustain: audio.setDroneSustain,
        droneRelease: audio.setDroneRelease,
      }) satisfies Record<SettingKey, (val: never) => void>,
    [
      playback.setPlayStyle,
      borrowing.setBorrowingMemory,
      audio.setSynthPresetId,
      audio.setEqProfileId,
      audio.setChorusWet,
      audio.setDelayWet,
      audio.setReverbWet,
      audio.setEnvelopeAttack,
      audio.setEnvelopeDecay,
      audio.setEnvelopeSustain,
      audio.setEnvelopeRelease,
      audio.setDroneAttack,
      audio.setDroneDecay,
      audio.setDroneSustain,
      audio.setDroneRelease,
    ]
  );

  const runSectionSideEffects = useCallback(
    (sectionId: SettingsSectionId) => {
      switch (sectionId) {
        case 'general':
        case 'voiceLeading':
          resetVoiceLeadingSession();
          break;
        case 'voiceBorrowing':
          clearChordBorrowingStates();
          break;
        case 'soundDesign':
          break;
      }
    },
    [resetVoiceLeadingSession, clearChordBorrowingStates]
  );

  const resetSettingsSection = useCallback(
    (sectionId: SettingsSectionId) => {
      const defaults =
        sectionId === 'voiceLeading'
          ? {
              ...getSectionDefaults('voiceLeading'),
              mode: getDefaultVoiceLeadingMode(playback.tiltModeEnabled),
            }
          : getSectionDefaults(sectionId);
      for (const [key, value] of Object.entries(defaults)) {
        applySetting[key as SettingKey](value as never);
      }
      runSectionSideEffects(sectionId);
    },
    [applySetting, runSectionSideEffects, playback.tiltModeEnabled]
  );

  const resetAllSettings = useCallback(() => {
    clearUserSettings();
    for (const sectionId of SETTINGS_SECTION_IDS) {
      resetSettingsSection(sectionId);
    }
  }, [resetSettingsSection]);

  const settingsSnapshot = useMemo(
    () => ({
      general: {
        tonalCenter,
        octaveRange,
        playStyle: playback.playStyle,
      },
      voiceLeading: { mode: voiceLeadingMode },
      voiceBorrowing: { memory: borrowing.borrowingMemory },
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
        droneAttack: audio.droneAttack,
        droneDecay: audio.droneDecay,
        droneSustain: audio.droneSustain,
        droneRelease: audio.droneRelease,
      },
    }),
    [
      tonalCenter,
      octaveRange,
      playback.playStyle,
      voiceLeadingMode,
      borrowing.borrowingMemory,
      audio.synthPresetId,
      audio.eqProfileId,
      audio.chorusWet,
      audio.delayWet,
      audio.reverbWet,
      audio.envelopeAttack,
      audio.envelopeDecay,
      audio.envelopeSustain,
      audio.envelopeRelease,
      audio.droneAttack,
      audio.droneDecay,
      audio.droneSustain,
      audio.droneRelease,
    ]
  );

  usePersistedUserSettings(settingsSnapshot);

  const handleChordSelect = useCallback(
    (chord: Chord) => {
      setSelectedChord(chord);
      const newState = getBorrowingStateForChord(
        chord.name,
        borrowingStateRef.current
      );
      setBorrowingState(newState);
      playAndDisplayChord(chord, newState);
    },
    [
      getBorrowingStateForChord,
      borrowingStateRef,
      setBorrowingState,
      playAndDisplayChord,
    ]
  );

  useEffect(() => {
    chordManager.setTonalCenterOffset(tonalCenter);
    chordManager.setOctaveRange(octaveRange);
  }, [tonalCenter, octaveRange]);

  /**
   * Re-voice the selected chord when global register or no-tilt voicing
   * controls change. Skips redundant audio when pitches are unchanged
   * (playAndDisplayChord -> skipIfUnchanged). Does not run on every tilt
   * tick; tilt voicing is sampled at tap time only.
   */
  useEffect(() => {
    const name = selectedChordNameRef.current;
    if (!name) return;

    const updatedChord = chordManager.getChordByName(name);
    if (!updatedChord) return;

    setSelectedChord(updatedChord);
    const newState = getBorrowingStateForChord(
      name,
      borrowingStateRef.current
    );
    setBorrowingState(newState);
    playAndDisplayChord(updatedChord, newState);
  }, [
    tonalCenter,
    octaveRange,
    noTiltVoicingLevel,
    noTiltPositionLevel,
    voiceLeadingMode,
    getBorrowingStateForChord,
    borrowingStateRef,
    setBorrowingState,
    playAndDisplayChord,
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
      playStyle: playback.playStyle,
      setPlayStyle: playback.setPlayStyle,
      tiltModeEnabled: playback.tiltModeEnabled,
      enterTiltSession,
      enterNoTiltSession,
      handleChordPointerDown: playback.handleChordPointerDown,
      handleChordPointerUp: playback.handleChordPointerUp,
      handleChordPointerEnter: playback.handleChordPointerEnter,
      envelopeAttack: audio.envelopeAttack,
      setEnvelopeAttack: audio.setEnvelopeAttack,
      envelopeDecay: audio.envelopeDecay,
      setEnvelopeDecay: audio.setEnvelopeDecay,
      envelopeSustain: audio.envelopeSustain,
      setEnvelopeSustain: audio.setEnvelopeSustain,
      envelopeRelease: audio.envelopeRelease,
      setEnvelopeRelease: audio.setEnvelopeRelease,
      droneAttack: audio.droneAttack,
      setDroneAttack: audio.setDroneAttack,
      droneDecay: audio.droneDecay,
      setDroneDecay: audio.setDroneDecay,
      droneSustain: audio.droneSustain,
      setDroneSustain: audio.setDroneSustain,
      droneRelease: audio.droneRelease,
      setDroneRelease: audio.setDroneRelease,
      borrowingMemory: borrowing.borrowingMemory,
      setBorrowingMemory: borrowing.setBorrowingMemory,
      voiceLeadingMode,
      setVoiceLeadingMode,
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
      resetAllSettings,
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
      playback.handleChordPointerDown,
      playback.handleChordPointerUp,
      playback.handleChordPointerEnter,
      handleChordSelect,
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
      audio.droneAttack,
      audio.setDroneAttack,
      audio.droneDecay,
      audio.setDroneDecay,
      audio.droneSustain,
      audio.setDroneSustain,
      audio.droneRelease,
      audio.setDroneRelease,
      voiceLeadingMode,
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
      resetAllSettings,
    ]
  );

  return (
    <TiltReadoutProvider
      status={deviceTilt.status}
      tilt={deviceTilt.tilt}
      requestPermission={deviceTilt.requestPermission}
    >
      <ChordContext.Provider value={value}>{children}</ChordContext.Provider>
    </TiltReadoutProvider>
  );
};
