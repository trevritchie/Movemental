/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import { chordManager, type Chord } from '../music/ChordManager';
import type { BorrowingState } from '../music/BorrowingLogic';
import {
  DEFAULT_TONAL_CENTER_OFFSET,
  DEFAULT_OCTAVE_RANGE,
} from '../music/config';
import {
  DEFAULT_STATIC_INVERSION_LEVEL,
  DEFAULT_STATIC_VOICING_LEVEL,
  type TiltSample,
} from '../music/TiltVoicingEngine';
import { useAudioSettings } from '../hooks/useAudioSettings';
import { useBorrowingMemory } from '../hooks/useBorrowingMemory';
import { useChordPlayback } from '../hooks/useChordPlayback';
import { useDeviceTilt, type TiltStatus } from '../hooks/useDeviceTilt';
import { triggerHaptic } from '../audio/haptics';
import type { PlayStyle } from './types';

export type { PlayStyle } from './types';

interface ChordContextType {
  tonalCenter: number;
  setTonalCenter: (val: number) => void;
  staticVoicingLevel: number;
  setStaticVoicingLevel: (val: number) => void;
  staticInversionLevel: number;
  setStaticInversionLevel: (val: number) => void;
  octaveRange: number;
  setOctaveRange: (val: number) => void;
  selectedChord: Chord | null;
  borrowingState: BorrowingState;
  activePitches: (number | null)[];
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
  lockedVoices: Record<string, Record<number, boolean>>;
  toggleVoiceLock: (chordName: string, line: number) => void;
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
  const [staticVoicingLevel, setStaticVoicingLevel] = useState(
    DEFAULT_STATIC_VOICING_LEVEL
  );
  const [staticInversionLevel, setStaticInversionLevel] = useState(
    DEFAULT_STATIC_INVERSION_LEVEL
  );
  const [octaveRange, setOctaveRange] = useState(DEFAULT_OCTAVE_RANGE);
  const [selectedChord, setSelectedChord] = useState<Chord | null>(null);

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

  // Ref avoids a hook ordering cycle: useDeviceTilt must exist before
  // useChordPlayback (which needs tiltRef), but the haptic gate needs the
  // play style that useChordPlayback owns.
  const playStyleRef = useRef<PlayStyle>('drone');
  const handleTiltLevelChange = useCallback(() => {
    if (playStyleRef.current === 'tilt') {
      triggerHaptic();
    }
  }, []);

  const deviceTilt = useDeviceTilt(handleTiltLevelChange);

  const staticVoicingLevelRef = useRef(staticVoicingLevel);
  const staticInversionLevelRef = useRef(staticInversionLevel);
  useEffect(() => {
    staticVoicingLevelRef.current = staticVoicingLevel;
  }, [staticVoicingLevel]);
  useEffect(() => {
    staticInversionLevelRef.current = staticInversionLevel;
  }, [staticInversionLevel]);

  const playback = useChordPlayback({
    getBorrowingStateForChord: borrowing.getBorrowingStateForChord,
    borrowingStateRef: borrowing.borrowingStateRef,
    setBorrowingState: borrowing.setBorrowingState,
    setSelectedChord,
    tiltRef: deviceTilt.tiltRef,
    staticVoicingLevelRef,
    staticInversionLevelRef,
  });

  useEffect(() => {
    playAndDisplayChordRef.current = playback.playAndDisplayChord;
  }, [playback.playAndDisplayChord]);

  useEffect(() => {
    playStyleRef.current = playback.playStyle;
  }, [playback.playStyle]);

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
    staticVoicingLevel,
    staticInversionLevel,
    getBorrowingStateForChord,
    borrowingStateRef,
    setBorrowingState,
    playAndDisplayChord,
  ]);

  const value: ChordContextType = {
    tonalCenter,
    setTonalCenter,
    staticVoicingLevel,
    setStaticVoicingLevel,
    staticInversionLevel,
    setStaticInversionLevel,
    octaveRange,
    setOctaveRange,
    selectedChord,
    borrowingState: borrowing.borrowingState,
    activePitches: playback.activePitches,
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
    lockedVoices: borrowing.lockedVoices,
    toggleVoiceLock: borrowing.toggleVoiceLock,
    tiltStatus: deviceTilt.status,
    tiltSample: deviceTilt.tilt,
    requestTiltPermission: deviceTilt.requestPermission,
  };

  return (
    <ChordContext.Provider value={value}>{children}</ChordContext.Provider>
  );
};
