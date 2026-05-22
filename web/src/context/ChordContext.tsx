import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { chordManager, type Chord } from '../music/ChordManager';
import { borrowingLogic, getInitialBorrowingState, type BorrowingState } from '../music/BorrowingLogic';
import { audioEngine } from '../audio/AudioEngine';
import { DEFAULT_TONAL_CENTER_OFFSET, DEFAULT_OCTAVE_RANGE, DEFAULT_VOICING } from '../music/config';

export type PlayingMode = 'adsr' | 'infinite';

interface ChordContextType {
  tonalCenter: number;
  setTonalCenter: (val: number) => void;
  voicing: string;
  setVoicing: (val: string) => void;
  octaveRange: number;
  setOctaveRange: (val: number) => void;
  selectedChord: Chord | null;
  borrowingState: BorrowingState;
  activePitches: (number | null)[];
  handleChordSelect: (chord: Chord) => void;
  handleBorrowingStateChange: (newState: BorrowingState) => void;

  // Real-time audio effects intensity settings
  chorusWet: number;
  setChorusWet: (val: number) => void;
  delayWet: number;
  setDelayWet: (val: number) => void;
  reverbWet: number;
  setReverbWet: (val: number) => void;

  // Synthesizer playing modes
  playingMode: PlayingMode;
  setPlayingMode: (mode: PlayingMode) => void;
  handleChordPointerDown: (chord: Chord) => void;
  handleChordPointerUp: () => void;
  handleChordPointerEnter: (chord: Chord) => void;

  // ADSR Envelope settings
  envelopeAttack: number;
  setEnvelopeAttack: (val: number) => void;
  envelopeDecay: number;
  setEnvelopeDecay: (val: number) => void;
  envelopeSustain: number;
  setEnvelopeSustain: (val: number) => void;
  envelopeRelease: number;
  setEnvelopeRelease: (val: number) => void;

  // Drone-specific ADSR settings
  droneAttack: number;
  setDroneAttack: (val: number) => void;
  droneDecay: number;
  setDroneDecay: (val: number) => void;
  droneSustain: number;
  setDroneSustain: (val: number) => void;
  droneRelease: number;
  setDroneRelease: (val: number) => void;

  // Borrowing Memory mode settings
  borrowingMemory: 'global' | 'per-chord';
  setBorrowingMemory: (mode: 'global' | 'per-chord') => void;
  lockedVoices: Record<string, Record<number, boolean>>;
  toggleVoiceLock: (chordName: string, line: number) => void;
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
  const [voicing, setVoicing] = useState(DEFAULT_VOICING);
  const [octaveRange, setOctaveRange] = useState(DEFAULT_OCTAVE_RANGE);

  const [chorusWet, setChorusWetState] = useState(0.35);
  const [delayWet, setDelayWetState] = useState(0.0);
  const [reverbWet, setReverbWetState] = useState(0.30);

  const [selectedChord, setSelectedChord] = useState<Chord | null>(null);
  const [borrowingState, setBorrowingState] = useState<BorrowingState>(getInitialBorrowingState());
  const [activePitches, setActivePitches] = useState<(number | null)[]>([]);
  const [playingMode, setPlayingMode] = useState<PlayingMode>('infinite');

  // Borrowing Memory state
  const [borrowingMemory, setBorrowingMemoryState] = useState<'global' | 'per-chord'>('per-chord');
  const [chordBorrowingStates, setChordBorrowingStates] = useState<Record<string, BorrowingState>>({});
  const [lockedVoices, setLockedVoices] = useState<Record<string, Record<number, boolean>>>({});

  // ADSR Envelope states (Click and Hold)
  const [envelopeAttack, setEnvelopeAttack] = useState(0.15);
  const [envelopeDecay, setEnvelopeDecay] = useState(2.0);
  const [envelopeSustain, setEnvelopeSustain] = useState(0.5);
  const [envelopeRelease, setEnvelopeRelease] = useState(2.5);

  // Drone-specific ADSR states
  const [droneAttack, setDroneAttack] = useState(4.5);
  const [droneDecay, setDroneDecay] = useState(3.5);
  const [droneSustain, setDroneSustain] = useState(0.4);
  const [droneRelease, setDroneRelease] = useState(0.50); // transition/stop release

  // Sync ADSR values with audioEngine based on current playing mode
  useEffect(() => {
    if (playingMode === 'infinite') {
      audioEngine.setEnvelope(droneAttack, droneDecay, droneSustain, droneRelease);
    } else {
      audioEngine.setEnvelope(envelopeAttack, envelopeDecay, envelopeSustain, envelopeRelease);
    }
  }, [playingMode, envelopeAttack, envelopeDecay, envelopeSustain, envelopeRelease, droneAttack, droneDecay, droneSustain, droneRelease]);

  // useRef instead of useState so the global pointerup listener always reads the
  // live value — React state updates are async and cause stale closures on the
  // first click (before the effect can re-register with the new value).
  const isPointerDownRef = useRef(false);
  const playingModeRef = useRef(playingMode);

  useEffect(() => {
    playingModeRef.current = playingMode;
    // Release active notes if playing mode changes to avoid stuck drone notes
    audioEngine.releaseActiveNotes();
    isPointerDownRef.current = false;
  }, [playingMode]);

  useEffect(() => {
    chordManager.setTonalCenterOffset(tonalCenter);
    chordManager.setVoicing(voicing);
    chordManager.setOctaveRange(octaveRange);

    if (selectedChord) {
      const updatedChord = chordManager.getChordByName(selectedChord.name);
      if (updatedChord) {
        handleChordSelect(updatedChord);
      }
    }
  }, [tonalCenter, voicing, octaveRange]);

  // Global listener for pointerup and pointercancel to ensure release when lifting
  // anywhere in window/OS. Registered once — logic is inlined so there is NO
  // stale function reference. All state is read directly from refs.
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isPointerDownRef.current) {
        isPointerDownRef.current = false;
        // Only release notes in 'adsr' mode — in 'infinite' (Drone) mode the
        // sound must never stop on mouse release, regardless of where it happens.
        if (playingModeRef.current === 'adsr') {
          audioEngine.releaseActiveNotes();
        }
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []); // empty deps — refs are always current, no re-registration needed

  const getBorrowingStateForChord = (chordName: string, currentGlobalState: BorrowingState): BorrowingState => {
    const initial = getInitialBorrowingState();
    if (["Earth", "Wind", "Fire"].includes(chordName)) {
      return initial;
    }
    const chordSaved = chordBorrowingStates[chordName] || getInitialBorrowingState();
    const result: BorrowingState = {
      active: currentGlobalState.active,
      chordName: chordName,
      noteStates: { ...currentGlobalState.noteStates },
      borrowingDirections: { ...currentGlobalState.borrowingDirections },
      circlePositions: { ...currentGlobalState.circlePositions }
    };
    for (let line = 1; line <= 4; line++) {
      const isLocked = lockedVoices[chordName]?.[line];
      if (borrowingMemory === 'per-chord' || isLocked) {
        result.noteStates[line] = chordSaved.noteStates[line];
        result.borrowingDirections[line] = chordSaved.borrowingDirections[line];
        result.circlePositions[line] = chordSaved.circlePositions[line];
      }
    }
    return result;
  };

  const playAndDisplayChord = (chord: Chord, state: BorrowingState) => {
    const pitches = borrowingLogic.generateActivePitches(chord, state);
    setActivePitches(pitches);

    const notesToPlay = pitches.filter((p): p is number => p !== null);
    if (notesToPlay.length > 0) {
      if (playingMode === 'infinite') {
        audioEngine.triggerAttack(notesToPlay);
      } else {
        // 'adsr' mode sidebar/topbar interaction plays as a preview
        audioEngine.playNotes(notesToPlay, "2n");
      }
    }
  };

  const handleChordSelect = (chord: Chord) => {
    setSelectedChord(chord);

    const newState = getBorrowingStateForChord(chord.name, borrowingState);
    setBorrowingState(newState);
    playAndDisplayChord(chord, newState);
  };

  const handleChordPointerDown = (chord: Chord) => {
    setSelectedChord(chord);
    isPointerDownRef.current = true;

    const newState = getBorrowingStateForChord(chord.name, borrowingState);
    setBorrowingState(newState);

    const pitches = borrowingLogic.generateActivePitches(chord, newState);
    setActivePitches(pitches);

    const notesToPlay = pitches.filter((p): p is number => p !== null);
    if (notesToPlay.length > 0) {
      // Both 'adsr' and 'infinite' playing modes trigger attack on pointer down
      audioEngine.triggerAttack(notesToPlay);
    }
  };

  const handleChordPointerUp = () => {
    isPointerDownRef.current = false;
    if (playingModeRef.current === 'adsr') {
      audioEngine.releaseActiveNotes();
    }
  };

  const handleChordPointerEnter = (chord: Chord) => {
    if (isPointerDownRef.current) {
      setSelectedChord(chord);

      const newState = getBorrowingStateForChord(chord.name, borrowingState);
      setBorrowingState(newState);

      const pitches = borrowingLogic.generateActivePitches(chord, newState);
      setActivePitches(pitches);

      const notesToPlay = pitches.filter((p): p is number => p !== null);
      if (notesToPlay.length > 0) {
        audioEngine.triggerAttack(notesToPlay);
      }
    }
  };

  const handleBorrowingStateChange = (newState: BorrowingState) => {
    setBorrowingState(newState);
    if (selectedChord) {
      setChordBorrowingStates(prev => {
        const currentChordState = prev[selectedChord.name] || getInitialBorrowingState();
        const updatedChordState = {
          ...currentChordState,
          borrowingDirections: { ...currentChordState.borrowingDirections },
          circlePositions: { ...currentChordState.circlePositions },
          noteStates: { ...currentChordState.noteStates }
        };

        for (let line = 1; line <= 4; line++) {
          const isLocked = lockedVoices[selectedChord.name]?.[line];
          if (borrowingMemory === 'per-chord' || isLocked) {
            updatedChordState.borrowingDirections[line] = newState.borrowingDirections[line];
            updatedChordState.circlePositions[line] = newState.circlePositions[line];
            updatedChordState.noteStates[line] = newState.noteStates[line];
          }
        }

        return {
          ...prev,
          [selectedChord.name]: updatedChordState
        };
      });
      playAndDisplayChord(selectedChord, newState);
    }
  };

  const setBorrowingMemory = (mode: 'global' | 'per-chord') => {
    setBorrowingMemoryState(mode);
    if (mode === 'per-chord' && selectedChord) {
      // Clone current active borrowing settings to initialize the chord's memory state
      setChordBorrowingStates(prev => ({
        ...prev,
        [selectedChord.name]: { ...borrowingState }
      }));
    }
  };

  const toggleVoiceLock = (chordName: string, line: number) => {
    const chordLocks = lockedVoices[chordName] || {};
    const newLocked = !chordLocks[line];

    const newLocksForChord = {
      ...chordLocks,
      [line]: newLocked
    };

    const newLockedVoices = {
      ...lockedVoices,
      [chordName]: newLocksForChord
    };

    setLockedVoices(newLockedVoices);

    let nextChordStates = { ...chordBorrowingStates };
    if (newLocked) {
      const currentChordState = chordBorrowingStates[chordName] || getInitialBorrowingState();
      const updatedChordState = {
        ...currentChordState,
        noteStates: {
          ...currentChordState.noteStates,
          [line]: borrowingState.noteStates[line]
        },
        borrowingDirections: {
          ...currentChordState.borrowingDirections,
          [line]: borrowingState.borrowingDirections[line]
        },
        circlePositions: {
          ...currentChordState.circlePositions,
          [line]: borrowingState.circlePositions[line]
        }
      };
      nextChordStates[chordName] = updatedChordState;
      setChordBorrowingStates(nextChordStates);
    }

    if (selectedChord && selectedChord.name === chordName) {
      const chordSaved = nextChordStates[chordName] || getInitialBorrowingState();
      const nextActiveState: BorrowingState = {
        active: borrowingState.active,
        chordName: borrowingState.chordName,
        noteStates: { ...borrowingState.noteStates },
        borrowingDirections: { ...borrowingState.borrowingDirections },
        circlePositions: { ...borrowingState.circlePositions }
      };

      if (borrowingMemory === 'per-chord' || newLocked) {
        nextActiveState.noteStates[line] = chordSaved.noteStates[line];
        nextActiveState.borrowingDirections[line] = chordSaved.borrowingDirections[line];
        nextActiveState.circlePositions[line] = chordSaved.circlePositions[line];
      }

      setBorrowingState(nextActiveState);
      playAndDisplayChord(selectedChord, nextActiveState);
    }
  };

  const setChorusWet = (val: number) => {
    setChorusWetState(val);
    audioEngine.setChorusWet(val);
  };

  const setDelayWet = (val: number) => {
    setDelayWetState(val);
    audioEngine.setDelayWet(val);
  };

  const setReverbWet = (val: number) => {
    setReverbWetState(val);
    audioEngine.setReverbWet(val);
  };

  const value = {
    tonalCenter, setTonalCenter,
    voicing, setVoicing,
    octaveRange, setOctaveRange,
    selectedChord,
    borrowingState,
    activePitches,
    handleChordSelect,
    handleBorrowingStateChange,
    chorusWet, setChorusWet,
    delayWet, setDelayWet,
    reverbWet, setReverbWet,
    playingMode, setPlayingMode,
    handleChordPointerDown,
    handleChordPointerUp,
    handleChordPointerEnter,
    envelopeAttack, setEnvelopeAttack,
    envelopeDecay, setEnvelopeDecay,
    envelopeSustain, setEnvelopeSustain,
    envelopeRelease, setEnvelopeRelease,
    droneAttack, setDroneAttack,
    droneDecay, setDroneDecay,
    droneSustain, setDroneSustain,
    droneRelease, setDroneRelease,
    borrowingMemory, setBorrowingMemory,
    lockedVoices, toggleVoiceLock
  };

  return (
    <ChordContext.Provider value={value}>
      {children}
    </ChordContext.Provider>
  );
};
