/**
 * Settings reset / apply controller for ChordProvider.
 *
 * Keeps section/group reset wiring out of the chord playback context body so
 * ChordContext stays focused on session and diagram state.
 */
import { useCallback, useMemo } from 'react';
import { clearUserSettings } from '../settings/userSettingsStorage';
import {
  getDefaultHarmonicFunctionLabelsEnabled,
  getDefaultVoiceLeadingMode,
  getSectionDefaults,
  SETTINGS_SECTION_IDS,
  type SettingKey,
  type SettingsSectionId,
} from '../settings/userSettingsSchema';
import {
  getSettingsGroupDefaults,
  type SettingsResetGroupId,
} from '../settings/settingsResetGroups';
import type {
  ClockLayoutMode,
  DiagramLayoutMode,
  PlayStyle,
  VoiceLeadingMode,
} from '../music/sessionModes';
import type { EqProfileId } from '../audio/outputProfiles';
import type { LayoutTier } from '../layout/breakpoints';
import { resolveShowChordNameLabels } from '../diagram/diagramScaling';

export interface UseSettingsResetOptions {
  tiltModeEnabled: boolean;
  layoutTier: LayoutTier;
  synthPresetId: string;
  setTonalCenter: (val: number) => void;
  setOctaveRange: (val: number) => void;
  setPlayStyle: (mode: PlayStyle) => void;
  setVoiceLeadingMode: (mode: VoiceLeadingMode) => void;
  setBorrowingMemory: (mode: 'global' | 'per-chord') => void;
  setClockLayoutMode: (mode: ClockLayoutMode) => void;
  setGlowingOrbsEnabled: (enabled: boolean) => void;
  setHarmonicFunctionLabelsEnabled: (enabled: boolean) => void;
  setDiagramLayoutMode: (mode: DiagramLayoutMode) => void;
  setRetriggerSoundingNotes: (enabled: boolean) => void;
  setSynthPresetId: (id: string) => void;
  setEqProfileId: (id: EqProfileId) => void;
  setChorusWet: (val: number) => void;
  setDelayWet: (val: number) => void;
  setReverbWet: (val: number) => void;
  setEnvelopeAttack: (val: number) => void;
  setEnvelopeDecay: (val: number) => void;
  setEnvelopeSustain: (val: number) => void;
  setEnvelopeRelease: (val: number) => void;
  setTapAttack: (val: number) => void;
  setTapDecay: (val: number) => void;
  setTapSustain: (val: number) => void;
  setTapRelease: (val: number) => void;
  resetVoiceLeadingSession: () => void;
  clearChordBorrowingStates: () => void;
}

export function useSettingsReset({
  tiltModeEnabled,
  layoutTier,
  synthPresetId,
  setTonalCenter,
  setOctaveRange,
  setPlayStyle,
  setVoiceLeadingMode,
  setBorrowingMemory,
  setClockLayoutMode,
  setGlowingOrbsEnabled,
  setHarmonicFunctionLabelsEnabled,
  setDiagramLayoutMode,
  setRetriggerSoundingNotes,
  setSynthPresetId,
  setEqProfileId,
  setChorusWet,
  setDelayWet,
  setReverbWet,
  setEnvelopeAttack,
  setEnvelopeDecay,
  setEnvelopeSustain,
  setEnvelopeRelease,
  setTapAttack,
  setTapDecay,
  setTapSustain,
  setTapRelease,
  resetVoiceLeadingSession,
  clearChordBorrowingStates,
}: UseSettingsResetOptions) {
  const applySetting = useMemo(
    () =>
      ({
        tonalCenter: setTonalCenter,
        octaveRange: setOctaveRange,
        playStyle: setPlayStyle,
        retriggerSoundingNotes: setRetriggerSoundingNotes,
        mode: setVoiceLeadingMode,
        memory: setBorrowingMemory,
        layoutMode: setClockLayoutMode,
        enabled: setGlowingOrbsEnabled,
        diagramMode: setDiagramLayoutMode,
        synthPresetId: setSynthPresetId,
        eqProfileId: setEqProfileId,
        chorusWet: setChorusWet,
        delayWet: setDelayWet,
        reverbWet: setReverbWet,
        envelopeAttack: setEnvelopeAttack,
        envelopeDecay: setEnvelopeDecay,
        envelopeSustain: setEnvelopeSustain,
        envelopeRelease: setEnvelopeRelease,
        tapAttack: setTapAttack,
        tapDecay: setTapDecay,
        tapSustain: setTapSustain,
        tapRelease: setTapRelease,
      }) satisfies Record<SettingKey, (val: never) => void>,
    [
      setTonalCenter,
      setOctaveRange,
      setPlayStyle,
      setVoiceLeadingMode,
      setBorrowingMemory,
      setClockLayoutMode,
      setGlowingOrbsEnabled,
      setRetriggerSoundingNotes,
      setDiagramLayoutMode,
      setSynthPresetId,
      setEqProfileId,
      setChorusWet,
      setDelayWet,
      setReverbWet,
      setEnvelopeAttack,
      setEnvelopeDecay,
      setEnvelopeSustain,
      setEnvelopeRelease,
      setTapAttack,
      setTapDecay,
      setTapSustain,
      setTapRelease,
    ],
  );

  const runSectionSideEffects = useCallback(
    (sectionId: SettingsSectionId) => {
      switch (sectionId) {
        case 'general':
        case 'voiceLeading':
          resetVoiceLeadingSession();
          break;
        case 'voiceBorrowing':
          clearChordBorrowingStates();
          break;
        case 'clockFace':
        case 'glowingOrbs':
        case 'harmonicFunctionLabels':
        case 'diagramLayout':
        case 'soundDesign':
          break;
      }
    },
    [resetVoiceLeadingSession, clearChordBorrowingStates],
  );

  const resetSettingsSection = useCallback(
    (sectionId: SettingsSectionId) => {
      if (sectionId === 'harmonicFunctionLabels') {
        setHarmonicFunctionLabelsEnabled(
          getDefaultHarmonicFunctionLabelsEnabled(
            resolveShowChordNameLabels(layoutTier, window.innerWidth),
          ),
        );
        runSectionSideEffects(sectionId);
        return;
      }

      const defaults =
        sectionId === 'voiceLeading'
          ? {
              ...getSectionDefaults('voiceLeading'),
              mode: getDefaultVoiceLeadingMode(tiltModeEnabled),
            }
          : getSectionDefaults(sectionId);
      for (const [key, value] of Object.entries(defaults)) {
        applySetting[key as SettingKey](value as never);
      }
      runSectionSideEffects(sectionId);
    },
    [
      applySetting,
      layoutTier,
      runSectionSideEffects,
      setHarmonicFunctionLabelsEnabled,
      tiltModeEnabled,
    ],
  );

  const resetSettingsGroup = useCallback(
    (groupId: SettingsResetGroupId) => {
      if (groupId === 'instrument') {
        const { synthPresetId: defaultPresetId } = getSettingsGroupDefaults(
          'instrument',
          {
            tiltModeEnabled,
            synthPresetId,
          },
        );
        setSynthPresetId(defaultPresetId as string);
        return;
      }

      if (groupId === 'harmonicFunctionLabels') {
        setHarmonicFunctionLabelsEnabled(
          getDefaultHarmonicFunctionLabelsEnabled(
            resolveShowChordNameLabels(layoutTier, window.innerWidth),
          ),
        );
        return;
      }

      const defaults = getSettingsGroupDefaults(groupId, {
        tiltModeEnabled,
        synthPresetId,
      });

      for (const [key, value] of Object.entries(defaults)) {
        applySetting[key as SettingKey](value as never);
      }

      if (groupId === 'voiceLeading') {
        resetVoiceLeadingSession();
      } else if (groupId === 'voiceBorrowing') {
        clearChordBorrowingStates();
      }
    },
    [
      applySetting,
      layoutTier,
      synthPresetId,
      setSynthPresetId,
      setHarmonicFunctionLabelsEnabled,
      tiltModeEnabled,
      resetVoiceLeadingSession,
      clearChordBorrowingStates,
    ],
  );

  const resetAllSettings = useCallback(() => {
    clearUserSettings();
    for (const sectionId of SETTINGS_SECTION_IDS) {
      resetSettingsSection(sectionId);
    }
  }, [resetSettingsSection]);

  return {
    resetSettingsSection,
    resetSettingsGroup,
    resetAllSettings,
  };
}
