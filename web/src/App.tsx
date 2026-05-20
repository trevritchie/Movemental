import { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { ElementalDiagram } from './components/ElementalDiagram';
import { ClockFace } from './components/ClockFace';
import { BorrowingControls } from './components/BorrowingControls';
import { chordManager, type Chord } from './music/ChordManager';
import { borrowingLogic, getInitialBorrowingState, type BorrowingState } from './music/BorrowingLogic';
import { audioEngine } from './audio/AudioEngine';
import { DEFAULT_TONAL_CENTER_OFFSET, DEFAULT_OCTAVE_RANGE, DEFAULT_VOICING } from './music/config';

function App() {
  const [tonalCenter, setTonalCenter] = useState(DEFAULT_TONAL_CENTER_OFFSET);
  const [voicing, setVoicing] = useState(DEFAULT_VOICING);
  const [octaveRange, setOctaveRange] = useState(DEFAULT_OCTAVE_RANGE);
  
  const [selectedChord, setSelectedChord] = useState<Chord | null>(null);
  const [borrowingState, setBorrowingState] = useState<BorrowingState>(getInitialBorrowingState());
  const [activePitches, setActivePitches] = useState<(number | null)[]>([]);

  // Initialize audio engine interaction (browsers require user gesture)
  useEffect(() => {
    const startAudio = async () => {
      await audioEngine.startContext();
    };
    document.addEventListener('click', startAudio, { once: true });
    return () => document.removeEventListener('click', startAudio);
  }, []);

  // Update chord manager when settings change
  useEffect(() => {
    chordManager.setTonalCenterOffset(tonalCenter);
    chordManager.setVoicing(voicing);
    chordManager.setOctaveRange(octaveRange);
    
    // If a chord is already selected, re-trigger it with new settings
    if (selectedChord) {
      const updatedChord = chordManager.getChordByName(selectedChord.name);
      if (updatedChord) {
        handleChordSelect(updatedChord);
      }
    }
  }, [tonalCenter, voicing, octaveRange]);

  const handleChordSelect = (chord: Chord) => {
    setSelectedChord(chord);
    
    let newState = { ...borrowingState };
    
    // Reset borrowing if it's a primary elemental chord
    if (["Earth", "Wind", "Fire"].includes(chord.name)) {
      newState = getInitialBorrowingState();
    }
    
    setBorrowingState(newState);
    playAndDisplayChord(chord, newState);
  };

  const handleBorrowingStateChange = (newState: BorrowingState) => {
    setBorrowingState(newState);
    if (selectedChord) {
      playAndDisplayChord(selectedChord, newState);
    }
  };

  const playAndDisplayChord = (chord: Chord, state: BorrowingState) => {
    const pitches = borrowingLogic.generateActivePitches(chord, state);
    setActivePitches(pitches);
    
    // Play notes (filtering out muted ones)
    const notesToPlay = pitches.filter((p): p is number => p !== null);
    if (notesToPlay.length > 0) {
      audioEngine.playNotes(notesToPlay);
    }
  };

  // Determine if borrowing controls should be disabled
  const isPrimaryElement = selectedChord ? ["Earth", "Wind", "Fire"].includes(selectedChord.name) : true;

  // Determine names for display
  let displayElementalName = selectedChord?.name || null;
  let displayTraditionalName = selectedChord?.traditionalName || null;
  
  // If borrowing is active, we might want to update the traditional name or elemental name slightly
  // For simplicity, we just use the base names in this prototype
  // A fully complete version might analyze the new pitches to find the new traditional chord name

  return (
    <div className="app-container">
      <TopBar 
        tonalCenter={tonalCenter}
        setTonalCenter={setTonalCenter}
        voicing={voicing}
        setVoicing={setVoicing}
        octaveRange={octaveRange}
        setOctaveRange={setOctaveRange}
      />
      
      <div className="main-content">
        <ElementalDiagram 
          selectedChord={selectedChord} 
          onChordSelect={handleChordSelect} 
        />
        
        <div className="side-panel">
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <ClockFace 
              tonalCenter={tonalCenter}
              activePitches={activePitches}
              elementalName={displayElementalName}
              traditionalName={displayTraditionalName}
            />
          </div>
          
          <div className="glass-panel">
            <BorrowingControls 
              state={borrowingState}
              onStateChange={handleBorrowingStateChange}
              disabled={!selectedChord || isPrimaryElement}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
