import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { chordManager, type Chord } from '../music/ChordManager';
import { borrowingLogic, getInitialBorrowingState, type BorrowingState } from '../music/BorrowingLogic';
import { audioEngine } from '../audio/AudioEngine';
import { DEFAULT_TONAL_CENTER_OFFSET, DEFAULT_OCTAVE_RANGE, DEFAULT_VOICING } from '../music/config';

export type PlayingMode = 'hold' | 'envelope' | 'infinite';

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
  const [playingMode, setPlayingMode] = useState<PlayingMode>('hold');
  // useRef instead of useState so the global pointerup listener always reads the
  // live value — React state updates are async and cause stale closures on the
  // first click (before the effect can re-register with the new value).
  const isPointerDownRef = useRef(false);

  useEffect(() => {
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
  // anywhere in window/OS. Registered once — reads from ref (never stale).
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isPointerDownRef.current) {
        handleChordPointerUp();
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []); // empty deps — the ref is always current, no re-registration needed

  const playAndDisplayChord = (chord: Chord, state: BorrowingState) => {
    const pitches = borrowingLogic.generateActivePitches(chord, state);
    setActivePitches(pitches);
    
    const notesToPlay = pitches.filter((p): p is number => p !== null);
    if (notesToPlay.length > 0) {
      if (playingMode === 'infinite') {
        audioEngine.triggerAttack(notesToPlay);
      } else {
        // 'hold' or 'envelope' mode sidebar/topbar interaction plays as a preview
        audioEngine.playNotes(notesToPlay, "2n");
      }
    }
  };

  const handleChordSelect = (chord: Chord) => {
    setSelectedChord(chord);
    
    let newState = { ...borrowingState };
    if (["Earth", "Wind", "Fire"].includes(chord.name)) {
      newState = getInitialBorrowingState();
    }
    
    setBorrowingState(newState);
    playAndDisplayChord(chord, newState);
  };

  const handleChordPointerDown = (chord: Chord) => {
    setSelectedChord(chord);
    isPointerDownRef.current = true;
    
    let newState = { ...borrowingState };
    if (["Earth", "Wind", "Fire"].includes(chord.name)) {
      newState = getInitialBorrowingState();
    }
    
    setBorrowingState(newState);

    const pitches = borrowingLogic.generateActivePitches(chord, newState);
    setActivePitches(pitches);
    
    const notesToPlay = pitches.filter((p): p is number => p !== null);
    if (notesToPlay.length > 0) {
      if (playingMode === 'envelope') {
        audioEngine.playNotes(notesToPlay, "2n");
      } else {
        // 'hold' or 'infinite'
        audioEngine.triggerAttack(notesToPlay);
      }
    }
  };

  const handleChordPointerUp = () => {
    isPointerDownRef.current = false;
    if (playingMode === 'hold') {
      audioEngine.releaseActiveNotes();
    }
  };

  const handleChordPointerEnter = (chord: Chord) => {
    if (playingMode === 'hold' && isPointerDownRef.current) {
      setSelectedChord(chord);
      
      let newState = { ...borrowingState };
      if (["Earth", "Wind", "Fire"].includes(chord.name)) {
        newState = getInitialBorrowingState();
      }
      
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
      playAndDisplayChord(selectedChord, newState);
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
    handleChordPointerEnter
  };

  return (
    <ChordContext.Provider value={value}>
      {children}
    </ChordContext.Provider>
  );
};
