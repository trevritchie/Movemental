/**
 * Thin JS bridge to the local NativeAudioSession Capacitor plugin.
 *
 * Native code owns AVAudioSession / Android audio focus. This module only
 * configures that session and forwards interruption/route events. Web Audio
 * unlock and the silent HTML keep-alive stay in `iosMediaChannel.ts`.
 */
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type NativeAudioSessionEvent = {
  type: 'interruption' | 'routeChange';
  state?: 'began' | 'ended';
  shouldResume?: boolean;
  reason?: string;
};

export interface NativeAudioSessionPlugin {
  configure(): Promise<{ active: boolean }>;
  addListener(
    eventName: 'audioSessionEvent',
    listener: (event: NativeAudioSessionEvent) => void,
  ): Promise<PluginListenerHandle>;
}

const webStub: NativeAudioSessionPlugin = {
  configure: async () => ({ active: false }),
  addListener: async () => ({ remove: async () => undefined }),
};

export const NativeAudioSession = registerPlugin<NativeAudioSessionPlugin>(
  'NativeAudioSession',
  {
    web: () => webStub,
  },
);
