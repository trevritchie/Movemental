import { useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { ElementalDiagram } from './components/ElementalDiagram';
import { ClockFace } from './components/ClockFace';
import { BorrowingControls } from './components/BorrowingControls';
import { audioEngine } from './audio/AudioEngine';
import { ChordProvider, useChordContext } from './context/ChordContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { selectedChord } = useChordContext();

  // Initialize audio engine on any user interaction
  // pointerdown fires before click, ensuring AudioContext is resumed
  // before playNotes is called in the same gesture
  useEffect(() => {
    const startAudio = async () => {
      await audioEngine.startContext();
    };
    document.addEventListener('pointerdown', startAudio, { once: true });
    return () => document.removeEventListener('pointerdown', startAudio);
  }, []);

  const isPrimaryElement = selectedChord ? ["Earth", "Wind", "Fire"].includes(selectedChord.name) : true;

  return (
    <div className="app-container">
      <TopBar />
      
      <div className="main-content">
        <ElementalDiagram />
        
        <div className="side-panel glass-panel unified-side-panel">
          <div className="side-section clock-section">
            <ClockFace />
          </div>
          
          <div className="side-divider" />
          
          <div className="side-section controls-section">
            <BorrowingControls disabled={!selectedChord || isPrimaryElement} />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ChordProvider>
        <AppContent />
      </ChordProvider>
    </ErrorBoundary>
  );
}

export default App;
