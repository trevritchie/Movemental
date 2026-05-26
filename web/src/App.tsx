import { useState } from 'react';
import { TopBar } from './components/TopBar';
import { ElementalDiagram } from './components/ElementalDiagram';
import { ClockFace } from './components/ClockFace';
import { BorrowingControls } from './components/BorrowingControls';
import { ChordProvider, useChordContext } from './context/ChordContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SplashPage } from './components/SplashPage';

function AppContent() {
  const { selectedChord } = useChordContext();

  const isPrimaryElement = selectedChord ? ["Earth", "Wind", "Fire"].includes(selectedChord.name) : true;

  return (
    <div className="app-container">
      <TopBar />
      
      <div className="main-content">
        <ElementalDiagram>
          <ClockFace isMobileOverlay />
        </ElementalDiagram>
        
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
  const [hasStarted, setHasStarted] = useState(false);

  return (
    <ErrorBoundary>
      <ChordProvider>
        {!hasStarted && <SplashPage onEnter={() => setHasStarted(true)} />}
        <AppContent />
      </ChordProvider>
    </ErrorBoundary>
  );
}

export default App;
