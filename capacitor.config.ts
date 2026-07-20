import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor shell config. `webDir` points at the local Vite production
 * build; there is intentionally no `server.url`, so the native app never
 * loads the Firebase-hosted site. Ship the bundled `dist/` via `cap sync`.
 */
const config: CapacitorConfig = {
  appId: 'com.movemental.app',
  appName: 'Movemental',
  webDir: 'dist',
  backgroundColor: '#09090b',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#09090b',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#09090b',
    },
  },
};

export default config;
