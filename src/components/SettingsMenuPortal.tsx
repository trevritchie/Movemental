import React, { Suspense } from 'react';
import type { SettingsModalProps } from './SettingsModal';
import { getSettingsModalImport } from './preloadSettingsModal';

const LazySettingsModal = React.lazy(getSettingsModalImport);

/** Loads settings/help UI on first open (code-split from main bundle). */
export const SettingsMenuPortal: React.FC<SettingsModalProps> = (props) => (
  <Suspense fallback={null}>
    <LazySettingsModal {...props} />
  </Suspense>
);
