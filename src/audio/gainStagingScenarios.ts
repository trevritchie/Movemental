/**
 * Offline render scenarios for gain-staging verification.
 */
import type { LayoutTier } from '../layout/breakpoints';
import type { EqProfileId } from './outputProfiles';
import type { AudioAnalysisWindow } from './audioBufferAnalysis';

export interface GainStagingScenario {
  id: string;
  presetId: string;
  profileId: EqProfileId;
  layoutTier: LayoutTier;
  midiNotes: number[];
  durationSec: number;
  sustainWindow: AudioAnalysisWindow;
  bodyWindow?: AudioAnalysisWindow;
}

export const DEFAULT_SUSTAIN_WINDOW: AudioAnalysisWindow = {
  startSec: 0.8,
  endSec: 2.0,
};

const C_MAJOR_4 = [60, 64, 67, 72];
const DENSE_6 = [48, 55, 60, 64, 67, 72];
const LOW_BASS_CLUSTER = [36, 40, 43, 48];

export const GAIN_STAGING_SCENARIOS: GainStagingScenario[] = [
  {
    id: 'warmPad-smallSpeakers-phone-4note',
    presetId: 'warmPad',
    profileId: 'smallSpeakers',
    layoutTier: 'phone',
    midiNotes: C_MAJOR_4,
    durationSec: 4,
    sustainWindow: DEFAULT_SUSTAIN_WINDOW,
  },
  {
    id: 'warmPad-smallSpeakers-phone-6note',
    presetId: 'warmPad',
    profileId: 'smallSpeakers',
    layoutTier: 'phone',
    midiNotes: DENSE_6,
    durationSec: 4,
    sustainWindow: DEFAULT_SUSTAIN_WINDOW,
  },
  {
    id: 'superSaw-smallSpeakers-phone-4note',
    presetId: 'superSaw',
    profileId: 'smallSpeakers',
    layoutTier: 'phone',
    midiNotes: C_MAJOR_4,
    durationSec: 4,
    sustainWindow: DEFAULT_SUSTAIN_WINDOW,
  },
  {
    id: 'grandPiano-flat-phone-4note',
    presetId: 'grandPiano',
    profileId: 'flat',
    layoutTier: 'phone',
    midiNotes: C_MAJOR_4,
    durationSec: 4,
    sustainWindow: DEFAULT_SUSTAIN_WINDOW,
  },
  {
    id: 'cello-smallSpeakers-phone-4note',
    presetId: 'cello',
    profileId: 'smallSpeakers',
    layoutTier: 'phone',
    midiNotes: C_MAJOR_4,
    durationSec: 4,
    sustainWindow: DEFAULT_SUSTAIN_WINDOW,
  },
  {
    id: 'tuba-smallSpeakers-phone-low',
    presetId: 'tuba',
    profileId: 'smallSpeakers',
    layoutTier: 'phone',
    midiNotes: LOW_BASS_CLUSTER,
    durationSec: 4,
    sustainWindow: DEFAULT_SUSTAIN_WINDOW,
  },
  {
    id: 'warmPad-flat-desktop-4note',
    presetId: 'warmPad',
    profileId: 'flat',
    layoutTier: 'desktop',
    midiNotes: C_MAJOR_4,
    durationSec: 4,
    sustainWindow: DEFAULT_SUSTAIN_WINDOW,
  },
];
