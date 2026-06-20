import React, { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Square, Maximize2, Minimize2, X } from 'lucide-react';
import { NOTE_NAMES_FLAT } from '../music/config';
import { audioEngine } from '../audio/AudioEngine';
import { useChordContext, type PlayStyle } from '../context/ChordContext';
import { useLayoutTier } from '../hooks/useLayoutTier';
import { useFullscreen } from '../hooks/useFullscreen';
import { AdsrPanelContent } from './settings/AdsrPanelContent';
import { EffectsPanelContent } from './settings/EffectsPanelContent';
import { BorrowingMemoryToggle } from './settings/BorrowingMemoryToggle';
import { IosInstallHintPortal } from './IosInstallHintPortal';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  menuId: string;
  sheetRef: React.RefObject<HTMLDivElement | null>;
}

export function useSettingsMenu() {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const openMenu = useCallback(() => setIsOpen(true), []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  return {
    isOpen,
    menuId,
    triggerRef,
    sheetRef,
    openMenu,
    closeMenu,
  };
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isOpen,
  onClose,
  menuId,
  sheetRef,
}) => {
  const {
    tonalCenter,
    setTonalCenter,
    octaveRange,
    setOctaveRange,
    playStyle,
    setPlayStyle,
  } = useChordContext();

  const layoutTier = useLayoutTier();
  const isDesktop = layoutTier === 'desktop';

  const [showAdsr, setShowAdsr] = React.useState(false);
  const [showEffects, setShowEffects] = React.useState(false);

  const idPrefix = `${menuId}-`;

  const closeSheet = useCallback(() => {
    setShowAdsr(false);
    setShowEffects(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeSheet]);

  useEffect(() => {
    if (isOpen) {
      sheetRef.current?.focus();
    }
  }, [isOpen, sheetRef]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeSheet();
  };

  // Portal to body: the voice panel uses glass-panel (backdrop-filter), which
  // traps position:fixed descendants inside the bottom pane.
  return createPortal(
    <div
      className="settings-menu-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={sheetRef}
        id={menuId}
        className="settings-menu-sheet glass-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-menu-sheet__handle" aria-hidden="true" />

        <div className="settings-menu-sheet__header">
          <h2 className="settings-menu-sheet__title">Settings</h2>
          <button
            type="button"
            className="settings-menu-sheet__close"
            onClick={closeSheet}
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        <div className="settings-menu-sheet__body">
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
                  Octave Range
                </span>
                <select
                  value={octaveRange}
                  onChange={(e) => setOctaveRange(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map((o) => (
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
                  {!isDesktop && <option value="tilt">Tilt</option>}
                </select>
              </label>
            </div>
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

/** Stop, settings, and fullscreen buttons for the phone voice panel. */
export const MobileActionButtons: React.FC = () => {
  const {
    isOpen,
    menuId,
    triggerRef,
    sheetRef,
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
      <div className="mobile-action-buttons" aria-label="Quick controls">
        <button
          type="button"
          className="mobile-toolbar-btn stop-btn mobile-toolbar-btn--panic"
          onClick={() => audioEngine.releaseActiveNotes()}
          title="Panic Switch"
          aria-label="Panic Switch: stop all notes"
        >
          <Square size={14} fill="currentColor" />
        </button>
        <button
          ref={triggerRef}
          type="button"
          className="mobile-toolbar-btn mobile-toolbar-btn--settings"
          onClick={openMenu}
          aria-label="Settings"
          aria-expanded={isOpen}
          aria-controls={menuId}
        >
          <Settings size={18} />
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
              <Minimize2 size={16} />
            ) : (
              <Maximize2 size={16} />
            )}
          </button>
        )}
      </div>

      <IosInstallHintPortal
        isOpen={showIosInstallHint}
        onDismiss={dismissIosInstallHint}
      />

      <SettingsSheet
        isOpen={isOpen}
        onClose={closeMenu}
        menuId={menuId}
        sheetRef={sheetRef}
      />
    </>
  );
};
