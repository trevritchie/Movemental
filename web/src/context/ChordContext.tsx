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
  DEFAULT_TONAL_CENTER_OFFSET,
  DEFAULT_OCTAVE_RANGE,
  DEFAULT_VOICE_LEADING_MODE,
} from '../music/config';
import {
  DEFAULT_NO_TILT_POSITION_LEVEL,
  DEFAULT_NO_TILT_VOICING_LEVEL,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import { useAudioSettings } from '../hooks/useAudioSettings';
import { useBorrowingMemory } from '../hooks/useBorrowingMemory';
import { useChordPlayback } from '../hooks/useChordPlayback';
import { useDeviceTilt, type TiltStatus } from '../hooks/useDeviceTilt';
import type { PlayStyle, VoiceLeadingMode } from './types';

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
  playStyle: PlayStyle;
  setPlayStyle: (mode: PlayStyle) => void;
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
  smoothBaseParallel: number;
  lastPlayedVoicingLabel: string | null;
  lastPlayedBassLabel: string | null;
  tiltStatus: TiltStatus;
  tiltSample: TiltSample;
  requestTiltPermission: () => Promise<void>;
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
  const [tonalCenter, setTonalCenter] = useState(DEFAULT_TONAL_CENTER_OFFSET);
  const [noTiltVoicingLevel, setNoTiltVoicingLevel] = useState(
    DEFAULT_NO_TILT_VOICING_LEVEL
  );
  const [noTiltPositionLevel, setNoTiltPositionLevel] = useState(
    DEFAULT_NO_TILT_POSITION_LEVEL
  );
  const [octaveRange, setOctaveRange] = useState(DEFAULT_OCTAVE_RANGE);
  const [selectedChord, setSelectedChord] = useState<Chord | null>(null);
  const [voiceLeadingMode, setVoiceLeadingMode] = useState<VoiceLeadingMode>(
    DEFAULT_VOICE_LEADING_MODE
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
  });

  useEffect(() => {
    playAndDisplayChordRef.current = playback.playAndDisplayChord;
  }, [playback.playAndDisplayChord]);

  const audio = useAudioSettings(playback.playStyle);

  const {
    getBorrowingStateForChord,
    borrowingStateRef,
    setBorrowingState,
  } = borrowing;
  const { playAndDisplayChord } = playback;

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
      setNoTiltVoicingLevel,
      noTiltPositionLevel,
      setNoTiltPositionLevel,
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
      playStyle: playback.playStyle,
      setPlayStyle: playback.setPlayStyle,
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
      smoothBaseParallel: playback.smoothBaseParallel,
      lastPlayedVoicingLabel: playback.lastPlayedVoicingLabel,
      lastPlayedBassLabel: playback.lastPlayedBassLabel,
      tiltStatus: deviceTilt.status,
      tiltSample: deviceTilt.tilt,
      requestTiltPermission: deviceTilt.requestPermission,
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
      playback.smoothBaseParallel,
      playback.lastPlayedVoicingLabel,
      playback.lastPlayedBassLabel,
      deviceTilt.status,
      deviceTilt.tilt,
      deviceTilt.requestPermission,
    ]
  );

  return (
    <ChordContext.Provider value={value}>{children}</ChordContext.Provider>
  );
};
