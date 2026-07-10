/** Reverb tail length (seconds). */
export const REVERB_DECAY_SEC = 3.5;
export const REVERB_PRE_DELAY_SEC = 0.02;
/** Ping-pong delay (dotted quarter, feedback 0-1). */
export const DELAY_TIME = '4n.';
export const DELAY_FEEDBACK = 0.25;
/** Chorus LFO and wet mix. */
export const CHORUS_LFO_HZ = 1.5;
export const CHORUS_DELAY_MS = 3.5;
export const CHORUS_DEPTH = 0.7;
/** Post-synth lowpass warmth. */
export const FILTER_CUTOFF_HZ = 900;
export const FILTER_ROLLOFF_DB = -12;
/** Micro-delay before attack to avoid release/attack clicks. */
export const ATTACK_SCHEDULE_OFFSET_SEC = 0.015;
/** Pre-FX bus trim so polyphonic chords retain headroom before dynamics. */
export const BUS_HEADROOM_DB = -6;
/** Attenuation into modulation FX to limit resonant peak buildup. */
export const FX_SEND_ATTENUATION_DB = -3;
/** Extra wet-path trim so harmonic enhance cannot exceed dry peak level. */
export const HARMONIC_WET_ATTENUATION_DB = -3;
/** Dev warning when limiter gain reduction exceeds this (audible territory). */
export const LIMITER_REDUCTION_WARN_DB = -3;
