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
import { useAudioLifecycle } from '../hooks/useAudioLifecycle';
import { useBorrowingMemory } from '../hooks/useBorrowingMemory';
import { useChordPlayback } from '../hooks/useChordPlayback';
import { useDeviceTilt } from '../hooks/useDeviceTilt';
import { usePersistedUserSettings } from '../hooks/usePersistedUserSettings';
import { TiltReadoutProvider } from './TiltReadoutContext';
import { useNoTiltChordLocks } from '../hooks/useNoTiltChordLocks';
import type { ElementalPlaybackResolution } from '../music/tiltVoicingPlayback';
import type { ClockLayoutMode, PlayStyle, VoiceLeadingMode } from './types';
import type { EqProfileId } from '../audio/outputProfiles';
import type { SynthPreset } from '../audio/synthPresets';
import { loadUserSettings, clearUserSettings } from '../settings/userSettingsStorage';
import {
  getDefaultVoiceLeadingMode,
  getSectionDefaults,
  SETTINGS_SECTION_IDS,
  type SettingsSectionId,
  type SettingKey,
} from '../settings/userSettingsSchema';
import {
  getSettingsGroupDefaults,
  type SettingsResetGroupId,
} from '../settings/settingsResetGroups';

export type { ClockLayoutMode, PlayStyle, VoiceLeadingMode } from './types';

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
  clockLayoutMode: ClockLayoutMode;
  setClockLayoutMode: (mode: ClockLayoutMode) => void;
  glowingOrbsEnabled: boolean;
  setGlowingOrbsEnabled: (enabled: boolean) => void;
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
  const [clockLayoutMode, setClockLayoutMode] = useState<ClockLayoutMode>(
    loadedSettings.clockFace.layoutMode
  );
  const [glowingOrbsEnabled, setGlowingOrbsEnabled] = useState(
    loadedSettings.glowingOrbs.enabled
  );

  const selectedChordNameRef = useRef<string | null>(null);
  /** Set by deferred no-tilt level flushes; consumed by the re-voice effect. */
  const suppressNoTiltRevoiceRef = useRef(false);

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
    suppressNoTiltRevoiceRef,
  });

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
    setNoTiltPositionLevel,
    noTiltLockMapsRef: noTiltLocks.lockMapsRef,
    applyNoTiltLocksForChord: noTiltLocks.applyLocksForChord,
    clearNoTiltChordLocks: noTiltLocks.clearAllLocks,
    initialPlayStyle: loadedSettings.general.playStyle,
    hasPersistedSettings,
  });

  useAudioLifecycle();

  useEffect(() => {
    playAndDisplayChordRef.current = playback.playAndDisplayChord;
  }, [playback.playAndDisplayChord]);

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
  } = playback;
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

  const applySetting = useMemo(
    () =>
      ({
        tonalCenter: setTonalCenter,
        octaveRange: setOctaveRange,
        playStyle: playback.setPlayStyle,
        mode: setVoiceLeadingMode,
        memory: borrowing.setBorrowingMemory,
        layoutMode: setClockLayoutMode,
        enabled: setGlowingOrbsEnabled,
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
        case 'clockFace':
        case 'glowingOrbs':
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

  const resetSettingsGroup = useCallback(
    (groupId: SettingsResetGroupId) => {
      if (groupId === 'instrument') {
        const { synthPresetId: defaultPresetId } = getSettingsGroupDefaults(
          'instrument',
          {
            tiltModeEnabled: playback.tiltModeEnabled,
            synthPresetId,
          },
        );
        setSynthPresetId(defaultPresetId as string);
        return;
      }

      const defaults = getSettingsGroupDefaults(groupId, {
        tiltModeEnabled: playback.tiltModeEnabled,
        synthPresetId,
      });

      for (const [key, value] of Object.entries(defaults)) {
        applySetting[key as SettingKey](value as never);
      }

      if (groupId === 'voiceLeading') {
        resetVoiceLeadingSession();
      } else if (groupId === 'voiceBorrowing') {
        clearChordBorrowingStates();
      }
    },
    [
      applySetting,
      synthPresetId,
      setSynthPresetId,
      playback.tiltModeEnabled,
      resetVoiceLeadingSession,
      clearChordBorrowingStates,
    ],
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
      clockFace: { layoutMode: clockLayoutMode },
      glowingOrbs: { enabled: glowingOrbsEnabled },
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
      clockLayoutMode,
      glowingOrbsEnabled,
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
   *
   * selectedChordNameRef is written only by commitPlayback (not mirrored from
   * selectedChord) so deferred level flushes cannot re-voice a stale name.
   *
   * Callback deps are read via refs so identity churn cannot loop this effect.
   */
  useEffect(() => {
    if (suppressNoTiltRevoiceRef.current) {
      suppressNoTiltRevoiceRef.current = false;
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
      clockLayoutMode,
      setClockLayoutMode,
      glowingOrbsEnabled,
      setGlowingOrbsEnabled,
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
      clockLayoutMode,
      glowingOrbsEnabled,
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
    ]
  );

  return (
    <TiltReadoutProvider
      status={deviceTilt.status}
      tilt={deviceTilt.tilt}
      orientationRef={deviceTilt.orientationRef}
      requestPermission={deviceTilt.requestPermission}
    >
      <ChordContext.Provider value={value}>{children}</ChordContext.Provider>
    </TiltReadoutProvider>
  );
};
