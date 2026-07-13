const loadSettingsModal = () =>
  import('./SettingsModal').then((module) => ({
    default: module.SettingsModal,
  }));

let settingsModalPromise: ReturnType<typeof loadSettingsModal> | null = null;

function getOrLoadSettingsModal() {
  if (!settingsModalPromise) {
    settingsModalPromise = loadSettingsModal();
  }
  return settingsModalPromise;
}

/** Shared dynamic import for lazy mount and post-splash preload. */
export function getSettingsModalImport() {
  return getOrLoadSettingsModal();
}

/** Fetch settings/help chunk after splash (keeps first paint lean). */
export function preloadSettingsModal(): void {
  getOrLoadSettingsModal();
}

/** Defer preload until the browser is idle so first-chord work stays priority. */
export function preloadSettingsModalAfterSplash(): void {
  const run = () => preloadSettingsModal();
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2000 });
    return;
  }
  window.setTimeout(run, 0);
}
