import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { NOTE_NAMES_FLAT, OCTAVE_RANGE_OPTIONS } from '../music/config';
import { useChordContext } from '../context/ChordContext';
import { useSoundDesignContext } from '../context/SoundDesignContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useFullscreen } from '../hooks/useFullscreen';
import { AdsrPanelContent } from './settings/AdsrPanelContent';
import { EffectsPanelContent } from './settings/EffectsPanelContent';
import { BorrowingMemoryToggle } from './settings/BorrowingMemoryToggle';
import { VoiceLeadingToggle } from './settings/VoiceLeadingToggle';
import { ClockLayoutToggle } from './settings/ClockLayoutToggle';
import { GlowingOrbsToggle } from './settings/GlowingOrbsToggle';
import { EqProfileToggle } from './settings/EqProfileToggle';
import { PlayStyleToggle } from './settings/PlayStyleToggle';
import { RetriggerSoundingNotesToggle } from './settings/RetriggerSoundingNotesToggle';
import { InstrumentPresetPicker } from './settings/InstrumentPresetPicker';
import { SettingsSettingHeader } from './settings/SettingsSettingHeader';
import { SETTINGS_RESET_GROUP_LABELS } from '../settings/settingsResetGroups';
import { IosInstallHintPortal } from './IosInstallHintPortal';
import { isIphone } from '../utils/devicePlatform';
import { getSynthPreset, isSamplerPreset } from '../audio/synthPresets';
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
    resetSettingsGroup,
    resetAllSettings,
  } = useChordContext();

  const {
    synthPresetId,
    setSynthPresetId,
    synthPresets,
    isSamplerInstrumentActive,
    isSamplerAdsrDisabled,
  } = useSoundDesignContext();

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

  const showAdsrPanel = !isSamplerAdsrDisabled;
  const showEffectsPanel = !isSamplerInstrumentActive;
  const isAdsrExpanded = showAdsr && showAdsrPanel;
  const isEffectsExpanded = showEffects && showEffectsPanel;

  const handlePresetSelect = useCallback(
    (id: string) => {
      setSynthPresetId(id);
      if (isSamplerPreset(getSynthPreset(id))) {
        setShowAdsr(false);
        setShowEffects(false);
      }
    },
    [setSynthPresetId],
  );

  const idPrefix = `${menuId}-`;
  const selectedInstrumentName =
    synthPresets?.find((preset) => preset.id === synthPresetId)?.name ??
    'Warm Pad';

  const closeModal = useCallback(() => {
    setShowAdsr(false);
    setShowEffects(false);
    setShowInstrument(false);
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
          className="settings-modal"
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

                <section
                  className="settings-menu-group"
                  aria-labelledby={`${idPrefix}group-audio`}
                >
                  <h3
                    id={`${idPrefix}group-audio`}
                    className="settings-menu-group__title"
                  >
                    Audio
                  </h3>
                  <div className="settings-menu-group__body">
                    <div className="settings-menu-setting">
                      <SettingsSettingHeader
                        groupId="tonalCenter"
                        onReset={resetSettingsGroup}
                      />
                      <div className="settings-menu-section__panel">
                        <div className="settings-menu-tonal-center">
                          <select
                            className="settings-menu-tonal-center__note"
                            value={tonalCenter}
                            onChange={(e) =>
                              setTonalCenter(Number(e.target.value))
                            }
                            aria-label="Tonal center note"
                          >
                            {NOTE_NAMES_FLAT.map((note, idx) => (
                              <option key={idx} value={idx}>
                                {note}
                              </option>
                            ))}
                          </select>
                          <select
                            className="settings-menu-tonal-center__octave"
                            value={octaveRange}
                            onChange={(e) =>
                              setOctaveRange(Number(e.target.value))
                            }
                            aria-label="Tonal center octave"
                          >
                            {OCTAVE_RANGE_OPTIONS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="settings-menu-setting">
                      <SettingsSettingHeader
                        groupId="instrument"
                        onReset={resetSettingsGroup}
                      />
                      <div className="settings-menu-section__panel">
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
                          aria-label={`Instrument: ${selectedInstrumentName}`}
                        >
                          <span className="settings-menu-accordion__value">
                            {selectedInstrumentName}
                          </span>
                        </button>
                        {showInstrument && (
                          <div className="settings-menu-accordion__panel settings-menu-accordion__panel--instrument">
                            <InstrumentPresetPicker
                              onPresetSelect={handlePresetSelect}
                            />
                          </div>
                        )}
                        {showAdsrPanel && (
                          <>
                            <button
                              type="button"
                              className={`settings-menu-accordion${isAdsrExpanded ? ' active' : ''}`}
                              onClick={() => {
                                setShowAdsr(!showAdsr);
                                if (!showAdsr) {
                                  setShowEffects(false);
                                  setShowInstrument(false);
                                }
                              }}
                              aria-expanded={isAdsrExpanded}
                            >
                              {SETTINGS_RESET_GROUP_LABELS.envelopeAdsr}
                            </button>
                            {isAdsrExpanded && (
                              <div className="settings-menu-accordion__panel">
                                <AdsrPanelContent idPrefix={idPrefix} />
                              </div>
                            )}
                          </>
                        )}
                        {showEffectsPanel && (
                          <>
                            <button
                              type="button"
                              className={`settings-menu-accordion${isEffectsExpanded ? ' active' : ''}`}
                              onClick={() => {
                                setShowEffects(!showEffects);
                                if (!showEffects) {
                                  setShowAdsr(false);
                                  setShowInstrument(false);
                                }
                              }}
                              aria-expanded={isEffectsExpanded}
                            >
                              {SETTINGS_RESET_GROUP_LABELS.synthEffects}
                            </button>
                            {isEffectsExpanded && (
                              <div className="settings-menu-accordion__panel">
                                <EffectsPanelContent idPrefix={idPrefix} />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="settings-menu-setting">
                      <SettingsSettingHeader
                        groupId="eq"
                        onReset={resetSettingsGroup}
                      />
                      <div className="settings-menu-section__panel">
                        <EqProfileToggle />
                      </div>
                    </div>
                  </div>
                </section>

                <section
                  className="settings-menu-group"
                  aria-labelledby={`${idPrefix}group-play-style`}
                >
                  <h3
                    id={`${idPrefix}group-play-style`}
                    className="settings-menu-group__title"
                  >
                    Play Style
                  </h3>
                  <div className="settings-menu-group__body">
                    <div className="settings-menu-setting">
                      <SettingsSettingHeader
                        groupId="playStyle"
                        onReset={resetSettingsGroup}
                      />
                      <div className="settings-menu-section__panel">
                        <PlayStyleToggle />
                      </div>
                    </div>

                    {playStyle === 'tap' && (
                      <div className="settings-menu-setting">
                        <SettingsSettingHeader
                          groupId="retriggerSoundingNotes"
                          onReset={resetSettingsGroup}
                        />
                        <div className="settings-menu-section__panel">
                          <RetriggerSoundingNotesToggle />
                        </div>
                      </div>
                    )}

                    <div className="settings-menu-setting">
                      <SettingsSettingHeader
                        groupId="voiceLeading"
                        onReset={resetSettingsGroup}
                      />
                      <div className="settings-menu-section__panel">
                        <p className="settings-menu-section__hint">
                          Choose how parallel position is set when you move
                          between chords.
                        </p>
                        <VoiceLeadingToggle />
                      </div>
                    </div>

                    <div className="settings-menu-setting">
                      <SettingsSettingHeader
                        groupId="voiceBorrowing"
                        onReset={resetSettingsGroup}
                      />
                      <div className="settings-menu-section__panel">
                        <p className="settings-menu-section__hint">
                          Choose whether borrowing settings are remembered per
                          chord or shared globally.
                        </p>
                        <BorrowingMemoryToggle />
                      </div>
                    </div>
                  </div>
                </section>

                <section
                  className="settings-menu-group"
                  aria-labelledby={`${idPrefix}group-visuals`}
                >
                  <h3
                    id={`${idPrefix}group-visuals`}
                    className="settings-menu-group__title"
                  >
                    Visuals
                  </h3>
                  <div className="settings-menu-group__body">
                    <div className="settings-menu-setting">
                      <SettingsSettingHeader
                        groupId="clockFace"
                        onReset={resetSettingsGroup}
                      />
                      <div className="settings-menu-section__panel">
                        <p className="settings-menu-section__hint">
                          Choose how note names are arranged around the diagram.
                        </p>
                        <ClockLayoutToggle />
                      </div>
                    </div>

                    <div className="settings-menu-setting">
                      <SettingsSettingHeader
                        groupId="glowingOrbs"
                        onReset={resetSettingsGroup}
                      />
                      <div className="settings-menu-section__panel">
                        <p className="settings-menu-section__hint">
                          Show the ambient Earth, Wind, and Fire glow behind the
                          diagram.
                        </p>
                        <GlowingOrbsToggle />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="settings-menu-reset-all">
                  <button
                    type="button"
                    className="settings-menu-reset-all__btn"
                    onClick={resetAllSettings}
                  >
                    Reset all settings
                  </button>
                </div>
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
