import React from 'react';
import { Settings, VolumeX, CircleHelp } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { useSettingsMenu } from '../hooks/useSettingsMenu';
import { RecordControl } from './RecordControl';
import { SettingsMenuPortal } from './SettingsMenuPortal';

interface MobileActionButtonsProps {
  side?: 'left' | 'right' | 'both';
}

/** Settings, record, panic, and help for the phone voice panel. */
export const MobileActionButtons: React.FC<MobileActionButtonsProps> = ({
  side = 'both',
}) => {
  const {
    isOpen,
    openToHelp,
    shouldMountModal,
    menuId,
    triggerRef,
    helpTriggerRef,
    modalRef,
    openMenu,
    openHelp,
    closeMenu,
  } = useSettingsMenu();

  const leftColumn = (
    <div
      className="mobile-action-column mobile-action-column--left"
      aria-label="Help and settings"
    >
      <button
        ref={helpTriggerRef}
        type="button"
        className="mobile-toolbar-btn mobile-toolbar-btn--help"
        onClick={openHelp}
        title="Help"
        aria-label="Help"
      >
        <CircleHelp size={22} />
      </button>
      <button
        ref={triggerRef}
        type="button"
        className="mobile-toolbar-btn mobile-toolbar-btn--settings"
        onClick={openMenu}
        aria-label="Settings"
        aria-expanded={isOpen}
        aria-controls={menuId}
        data-tour-id="tour-settings"
      >
        <Settings size={22} />
      </button>
    </div>
  );

  const rightColumn = (
    <div
      className="mobile-action-column mobile-action-column--right"
      aria-label="Playback controls"
    >
      <button
        type="button"
        className="mobile-toolbar-btn mobile-toolbar-btn--panic"
        onClick={() => audioEngine.releaseActiveNotes()}
        title="Panic Switch"
        aria-label="Panic Switch: stop all notes"
        data-tour-id="tour-panic"
      >
        <VolumeX size={22} />
      </button>
      <RecordControl variant="mobile" />
    </div>
  );

  const sharedPortals = side !== 'right' && shouldMountModal ? (
    <SettingsMenuPortal
      isOpen={isOpen}
      openToHelp={openToHelp}
      onClose={closeMenu}
      menuId={menuId}
      modalRef={modalRef}
    />
  ) : null;

  if (side === 'left') {
    return (
      <>
        {leftColumn}
        {sharedPortals}
      </>
    );
  }

  if (side === 'right') {
    return rightColumn;
  }

  return (
    <>
      <div className="mobile-action-buttons" aria-label="Quick controls">
        {leftColumn}
        {rightColumn}
      </div>
      {sharedPortals}
    </>
  );
};
