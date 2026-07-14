/**
 * Re-exports session mode types from the music domain tier.
 *
 * Prefer importing from `@/music/sessionModes` (or `../music/sessionModes`)
 * in new code so the domain layer does not depend on context.
 */
export {
  commitsSmoothestParallelBaseline,
  usesDeviceTilt,
  type ClockLayoutMode,
  type PlayStyle,
  type VoiceLeadingMode,
} from '../music/sessionModes';
