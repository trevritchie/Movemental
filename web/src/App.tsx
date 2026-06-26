import { useState } from 'react';
import { ElementalDiagram } from './components/ElementalDiagram';
import { ClockFace } from './components/ClockFace';
import { BorrowingControls } from './components/BorrowingControls';
import { ChordProvider, useChordContext } from './context/ChordContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SplashPage } from './components/SplashPage';
import { LandscapePrompt } from './components/LandscapePrompt';
import { useLayoutTier, LayoutTierProvider } from './hooks/useLayoutTier';
import { usePhoneLandscapeBlocked } from './hooks/usePhoneLandscapeBlocked';

const PRIMARY_ELEMENT_NAMES = new Set(['Earth', 'Wind', 'Fire']);

function AppContent() {
  const { selectedChord } = useChordContext();
  const layoutTier = useLayoutTier();

  const isPrimaryElement = selectedChord
    ? PRIMARY_ELEMENT_NAMES.has(selectedChord.name)
    : true;
  const isPhoneLayout = layoutTier === 'phone';

  return (
    <div className="app-container">
      <div className="main-content">
        {isPhoneLayout ? (
          <ElementalDiagram>
            <ClockFace isMobileOverlay />
          </ElementalDiagram>
        ) : (
          <ElementalDiagram />
        )}

        <div className="side-panel glass-panel unified-side-panel">
          {!isPhoneLayout && (
            <>
              <div className="side-section clock-section">
                <ClockFace />
              </div>

              <div className="side-divider" />
            </>
          )}

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
  const isBlocked = usePhoneLandscapeBlocked();

  return (
    <ErrorBoundary>
      <LayoutTierProvider>
        <ChordProvider>
          {isBlocked ? (
            <LandscapePrompt />
          ) : (
            <>
              {!hasStarted && <SplashPage onEnter={() => setHasStarted(true)} />}
              <AppContent />
            </>
          )}
        </ChordProvider>
      </LayoutTierProvider>
    </ErrorBoundary>
  );
}

export default App;
