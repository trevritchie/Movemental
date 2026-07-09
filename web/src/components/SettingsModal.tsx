import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { NOTE_NAMES_FLAT, OCTAVE_RANGE_OPTIONS } from '../music/config';
import { useChordContext, type PlayStyle } from '../context/ChordContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useFullscreen } from '../hooks/useFullscreen';
import { AdsrPanelContent } from './settings/AdsrPanelContent';
import { EffectsPanelContent } from './settings/EffectsPanelContent';
import { BorrowingMemoryToggle } from './settings/BorrowingMemoryToggle';
import { VoiceLeadingToggle } from './settings/VoiceLeadingToggle';
import { OutputProfileToggle } from './settings/OutputProfileToggle';
import { InstrumentPresetPicker } from './settings/InstrumentPresetPicker';
import { IosInstallHintPortal } from './IosInstallHintPortal';
import { isIphone } from '../utils/devicePlatform';
import { HelpPage } from './help/HelpPage';
import { helpDialogTitle, type HelpView } from './help/helpTypes';
import { useTour } from './tour/tourContext';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface SettingsModalProps {
  isOpen: boolean;
  openToHelp: boolean;
  onClose: () => void;
  menuId: string;
  modalRef: React.RefObject<HTMLDivElement | null>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  openToHelp,
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

  const {
    isFullscreen,
    canFullscreen,
    showIosInstallHint,
    toggleFullscreen,
    dismissIosInstallHint,
  } = useFullscreen();

  const [showAdsr, setShowAdsr] = React.useState(false);
  const [showEffects, setShowEffects] = React.useState(false);
  const [showInstrument, setShowInstrument] = React.useState(false);
  const [helpView, setHelpView] = React.useState<HelpView>('hub');
  const { startTour, hasCompletedTour } = useTour();

  const idPrefix = `${menuId}-`;

  const closeModal = useCallback(() => {
    setShowAdsr(false);
    setShowEffects(false);
    setHelpView('hub');
    onClose();
  }, [onClose]);

  const backWithinHelp = useCallback(() => {
    setHelpView('hub');
  }, []);

  const handleStartTourFromHelp = useCallback(
    (options?: { restart?: boolean }) => {
      closeModal();
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          startTour(options);
        });
      });
    },
    [closeModal, startTour],
  );

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openToHelp && helpView !== 'hub') {
          backWithinHelp();
        } else {
          closeModal();
        }
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
  }, [isOpen, closeModal, backWithinHelp, openToHelp, helpView, modalRef]);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen, modalRef]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  };

  const helpTitle = openToHelp ? helpDialogTitle(helpView) : 'Settings';

  return createPortal(
    <>
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
          aria-label={helpTitle}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="settings-modal__header">
            <h2 className="settings-modal__title">{helpTitle}</h2>
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
            {openToHelp ? (
              <HelpPage
                helpView={helpView}
                onHelpViewChange={setHelpView}
                onBackToSettings={closeModal}
                onStartTour={handleStartTourFromHelp}
                hasCompletedTour={hasCompletedTour}
              />
            ) : (
              <>
                {canFullscreen && (
                  <section className="settings-menu-section settings-menu-section--fullscreen">
                    <button
                      type="button"
                      className="settings-help-entry settings-fullscreen-entry"
                      onClick={() => void toggleFullscreen()}
                    >
                      {isFullscreen ? (
                        <Minimize2 size={22} aria-hidden="true" />
                      ) : (
                        <Maximize2 size={22} aria-hidden="true" />
                      )}
                      <span className="settings-help-entry__text">
                        <span className="settings-help-entry__title">
                          {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                        </span>
                        <span className="settings-help-entry__subtitle">
                          Expand the app to fill the display
                        </span>
                      </span>
                    </button>
                  </section>
                )}

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
                    Choose how parallel position is set when you move between
                    chords.
                  </p>
                  <VoiceLeadingToggle />
                </section>

                <section className="settings-menu-section">
                  <h3 className="settings-menu-section__title">
                    Voice Borrowing
                  </h3>
                  <p className="settings-menu-section__hint">
                    Choose whether borrowing settings are remembered per chord or
                    shared globally.
                  </p>
                  <BorrowingMemoryToggle />
                </section>

                <section className="settings-menu-section">
                  <h3 className="settings-menu-section__title">Sound Design</h3>
                  <p className="settings-menu-section__hint">
                    Output profile and instrument timbre for playback and recording.
                  </p>
                  <OutputProfileToggle />
                  <button
                    type="button"
                    className={`settings-menu-accordion${showInstrument ? ' active' : ''}`}
                    onClick={() => {
                      setShowInstrument(!showInstrument);
                      if (!showInstrument) {
                        setShowAdsr(false);
                        setShowEffects(false);
                      }
                    }}
                    aria-expanded={showInstrument}
                  >
                    Instrument
                  </button>
                  {showInstrument && (
                    <div className="settings-menu-accordion__panel">
                      <InstrumentPresetPicker />
                    </div>
                  )}
                  <button
                    type="button"
                    className={`settings-menu-accordion${showAdsr ? ' active' : ''}`}
                    onClick={() => {
                      setShowAdsr(!showAdsr);
                      if (!showAdsr) {
                        setShowEffects(false);
                        setShowInstrument(false);
                      }
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
                  <button
                    type="button"
                    className={`settings-menu-accordion${showEffects ? ' active' : ''}`}
                    onClick={() => {
                      setShowEffects(!showEffects);
                      if (!showEffects) {
                        setShowAdsr(false);
                        setShowInstrument(false);
                      }
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
              </>
            )}
          </div>
        </div>
      </div>
      <IosInstallHintPortal
        isOpen={showIosInstallHint && isIphone()}
        onDismiss={dismissIosInstallHint}
      />
    </>,
    document.body,
  );
};
