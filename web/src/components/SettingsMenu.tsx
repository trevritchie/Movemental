import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, VolumeX, Maximize2, Minimize2, X } from 'lucide-react';
import { NOTE_NAMES_FLAT, OCTAVE_RANGE_OPTIONS } from '../music/config';
import { audioEngine } from '../audio/AudioEngine';
import { useChordContext, type PlayStyle } from '../context/ChordContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useFullscreen } from '../hooks/useFullscreen';
import { AdsrPanelContent } from './settings/AdsrPanelContent';
import { EffectsPanelContent } from './settings/EffectsPanelContent';
import { BorrowingMemoryToggle } from './settings/BorrowingMemoryToggle';
import { VoiceLeadingToggle } from './settings/VoiceLeadingToggle';
import { IosInstallHintPortal } from './IosInstallHintPortal';
import { isIphone } from '../utils/devicePlatform';

import { useSettingsMenu } from '../hooks/useSettingsMenu';
import { RecordControl } from './RecordControl';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuId: string;
  modalRef: React.RefObject<HTMLDivElement | null>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  menuId,
  modalRef,
}) => {
  const {
    tonalCenter,
    setTonalCenter,
    octaveRange,
    setOctaveRange,
    playStyle,
    setPlayStyle,
  } = useChordContext();

  const [showAdsr, setShowAdsr] = React.useState(false);
  const [showEffects, setShowEffects] = React.useState(false);

  const idPrefix = `${menuId}-`;

  const closeModal = useCallback(() => {
    setShowAdsr(false);
    setShowEffects(false);
    onClose();
  }, [onClose]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }

      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !modal.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeModal, modalRef]);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen, modalRef]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  };

  return createPortal(
    <div
      className="settings-modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        id={menuId}
        className="settings-modal glass-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-modal__header">
          <h2 className="settings-modal__title">Settings</h2>
          <button
            type="button"
            className="settings-modal__close"
            onClick={closeModal}
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        <div className="settings-modal__body">
          <section className="settings-menu-section">
            <h3 className="settings-menu-section__title">General</h3>
            <div className="settings-menu-fields">
              <label className="settings-menu-field">
                <span className="settings-menu-field__label">
                  Tonal Center
                </span>
                <select
                  value={tonalCenter}
                  onChange={(e) => setTonalCenter(Number(e.target.value))}
                >
                  {NOTE_NAMES_FLAT.map((note, idx) => (
                    <option key={idx} value={idx}>
                      {note}
                    </option>
                  ))}
                </select>
              </label>

              <label className="settings-menu-field">
                <span className="settings-menu-field__label">
                  Home Octave
                </span>
                <select
                  value={octaveRange}
                  onChange={(e) => setOctaveRange(Number(e.target.value))}
                >
                  {OCTAVE_RANGE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      Octave {o}
                    </option>
                  ))}
                </select>
              </label>

              <label className="settings-menu-field">
                <span className="settings-menu-field__label">
                  Play Style
                </span>
                <select
                  value={playStyle}
                  onChange={(e) =>
                    setPlayStyle(e.target.value as PlayStyle)
                  }
                >
                  <option value="click_and_hold">Click & Hold</option>
                  <option value="drone">Drone</option>
                </select>
              </label>
            </div>
          </section>

          <section className="settings-menu-section">
            <h3 className="settings-menu-section__title">
              Voice Leading
            </h3>
            <p className="settings-menu-section__hint">
              Choose how parallel position is set when you move between chords.
            </p>
            <VoiceLeadingToggle />
          </section>

          <section className="settings-menu-section">
            <button
              type="button"
              className={`settings-menu-accordion${showAdsr ? ' active' : ''}`}
              onClick={() => {
                setShowAdsr(!showAdsr);
                if (!showAdsr) setShowEffects(false);
              }}
              aria-expanded={showAdsr}
            >
              Envelope (ADSR)
            </button>
            {showAdsr && (
              <div className="settings-menu-accordion__panel">
                <AdsrPanelContent idPrefix={idPrefix} />
              </div>
            )}
          </section>

          <section className="settings-menu-section">
            <button
              type="button"
              className={`settings-menu-accordion${showEffects ? ' active' : ''}`}
              onClick={() => {
                setShowEffects(!showEffects);
                if (!showEffects) setShowAdsr(false);
              }}
              aria-expanded={showEffects}
            >
              Synth Effects
            </button>
            {showEffects && (
              <div className="settings-menu-accordion__panel">
                <EffectsPanelContent idPrefix={idPrefix} />
              </div>
            )}
          </section>

          <section className="settings-menu-section">
            <h3 className="settings-menu-section__title">Voice Borrowing</h3>
            <p className="settings-menu-section__hint">
              Choose whether borrowing settings are remembered per chord or
              shared globally.
            </p>
            <BorrowingMemoryToggle />
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
};

interface MobileActionButtonsProps {
  side?: 'left' | 'right' | 'both';
}

/** Settings, record, panic, and fullscreen for the phone voice panel. */
export const MobileActionButtons: React.FC<MobileActionButtonsProps> = ({
  side = 'both',
}) => {
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

  const leftColumn = (
    <div
      className="mobile-action-column mobile-action-column--left"
      aria-label="Settings and display"
    >
      <button
        ref={triggerRef}
        type="button"
        className="mobile-toolbar-btn mobile-toolbar-btn--settings"
        onClick={openMenu}
        aria-label="Settings"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        <Settings size={22} />
      </button>
      {canFullscreen && (
        <button
          type="button"
          className="mobile-toolbar-btn mobile-toolbar-btn--fullscreen"
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
  );

  const rightColumn = (
    <div
      className="mobile-action-column mobile-action-column--right"
      aria-label="Playback controls"
    >
      <button
        type="button"
        className="mobile-toolbar-btn stop-btn mobile-toolbar-btn--panic"
        onClick={() => audioEngine.releaseActiveNotes()}
        title="Panic Switch"
        aria-label="Panic Switch: stop all notes"
      >
        <VolumeX size={22} />
      </button>
      <RecordControl variant="mobile" />
    </div>
  );

  const sharedPortals = side !== 'right' ? (
    <>
      <IosInstallHintPortal
        isOpen={showIosInstallHint && isIphone()}
        onDismiss={dismissIosInstallHint}
      />

      <SettingsModal
        isOpen={isOpen}
        onClose={closeMenu}
        menuId={menuId}
        modalRef={modalRef}
      />
    </>
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
