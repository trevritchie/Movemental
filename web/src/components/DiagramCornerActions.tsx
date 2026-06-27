import React from 'react';
import { Settings, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { useLayoutTier } from '../hooks/useLayoutTier';
import { useFullscreen } from '../hooks/useFullscreen';
import { SettingsModal } from './SettingsMenu';
import { useSettingsMenu } from '../hooks/useSettingsMenu';
import { IosInstallHintPortal } from './IosInstallHintPortal';
import { RecordControl } from './RecordControl';

/** Panic, settings, and fullscreen controls for desktop/tablet diagram corners. */
export const DiagramCornerActions: React.FC = () => {
  const layoutTier = useLayoutTier();
  const isTablet = layoutTier === 'tablet';
  const {
    isOpen,
    menuId,
    triggerRef,
    modalRef,
    openMenu,
    closeMenu,
  } = useSettingsMenu();

  const {
    isFullscreen,
    canFullscreen,
    showIosInstallHint,
    toggleFullscreen,
    dismissIosInstallHint,
  } = useFullscreen();

  return (
    <>
      <div className="diagram-corner-actions" aria-label="Diagram controls">
        <div className="diagram-corner-actions--bottom-left">
          <button
            ref={triggerRef}
            type="button"
            className="diagram-toolbar-btn diagram-toolbar-btn--settings"
            onClick={openMenu}
            aria-label="Settings"
            aria-expanded={isOpen}
            aria-controls={menuId}
            data-tour-id="tour-settings"
          >
            <Settings size={22} />
          </button>
          {canFullscreen && (
            <button
              type="button"
              className="diagram-toolbar-btn diagram-toolbar-btn--fullscreen"
              onClick={() => void toggleFullscreen()}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullscreen ? (
                <Minimize2 size={20} />
              ) : (
                <Maximize2 size={20} />
              )}
            </button>
          )}
        </div>

        <div className="diagram-corner-actions--bottom-right">
          <button
            type="button"
            className="diagram-toolbar-btn stop-btn diagram-toolbar-btn--panic"
            onClick={() => audioEngine.releaseActiveNotes()}
            title="Panic Switch"
            aria-label="Panic Switch: stop all notes"
            data-tour-id="tour-panic"
          >
            <VolumeX size={22} />
          </button>
          <RecordControl variant="diagram" />
        </div>
      </div>

      <IosInstallHintPortal
        isOpen={showIosInstallHint && isTablet}
        onDismiss={dismissIosInstallHint}
      />

      <SettingsModal
        isOpen={isOpen}
        onClose={closeMenu}
        menuId={menuId}
        modalRef={modalRef}
      />
    </>
  );
};
