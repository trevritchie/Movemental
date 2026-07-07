import React from 'react';
import { Settings, VolumeX, CircleHelp } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { SettingsModal } from './SettingsMenu';
import { useSettingsMenu } from '../hooks/useSettingsMenu';
import { RecordControl } from './RecordControl';

/** Panic, settings, and help controls for desktop/tablet diagram corners. */
export const DiagramCornerActions: React.FC = () => {
  const {
    isOpen,
    openToHelp,
    menuId,
    triggerRef,
    helpTriggerRef,
    modalRef,
    openMenu,
    openHelp,
    closeMenu,
  } = useSettingsMenu();

  return (
    <>
      <div className="diagram-corner-actions" aria-label="Diagram controls">
        <div className="diagram-corner-actions--bottom-left">
          <button
            ref={helpTriggerRef}
            type="button"
            className="diagram-toolbar-btn diagram-toolbar-btn--help"
            onClick={openHelp}
            title="Help"
            aria-label="Help"
          >
            <CircleHelp size={22} />
          </button>
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
        </div>

        <div className="diagram-corner-actions--bottom-right">
          <button
            type="button"
            className="diagram-toolbar-btn diagram-toolbar-btn--panic"
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

      <SettingsModal
        isOpen={isOpen}
        openToHelp={openToHelp}
        onClose={closeMenu}
        menuId={menuId}
        modalRef={modalRef}
      />
    </>
  );
};
