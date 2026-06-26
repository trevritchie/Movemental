/* eslint-disable react-refresh/only-export-components */
/**
 * Tilt readout context: isolates ~7 Hz tilt updates from ChordContext.
 */
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { TiltSample } from '@/music/TiltVoicingEngine';
import type { TiltStatus } from '@/hooks/useDeviceTilt';

interface TiltReadoutContextType {
  tiltStatus: TiltStatus;
  tiltSample: TiltSample;
  requestTiltPermission: () => Promise<void>;
}

const TiltReadoutContext = createContext<TiltReadoutContextType | null>(null);

export function TiltReadoutProvider({
  status,
  tilt,
  requestPermission,
  children,
}: {
  status: TiltStatus;
  tilt: TiltSample;
  requestPermission: () => Promise<void>;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      tiltStatus: status,
      tiltSample: tilt,
      requestTiltPermission: requestPermission,
    }),
    [status, tilt, requestPermission]
  );

  return (
    <TiltReadoutContext.Provider value={value}>
      {children}
    </TiltReadoutContext.Provider>
  );
}

export function useTiltReadoutContext(): TiltReadoutContextType {
  const ctx = useContext(TiltReadoutContext);
  if (!ctx) {
    throw new Error(
      'useTiltReadoutContext must be used within TiltReadoutProvider'
    );
  }
  return ctx;
}
