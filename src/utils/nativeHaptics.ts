/**
 * Light haptic feedback on native chord commits. Fire-and-forget after
 * audio dispatch so the playback hot path is never blocked on haptics.
 */
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNativeApp } from './nativePlatform';

/** Light impact on pointer chord commits inside the native shell. */
export function triggerChordCommitHaptic(): void {
  if (!isNativeApp()) return;
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}
