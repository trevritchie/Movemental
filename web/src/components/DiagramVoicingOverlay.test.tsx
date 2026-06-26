import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiagramVoicingOverlay } from './DiagramVoicingOverlay';

const toggleNoTiltVoicingLock = vi.fn();
const toggleNoTiltBassLock = vi.fn();

// Drone/no-tilt fixture: bass locked, voicing unlocked, all borrowing lines on.
vi.mock('../context/ChordContext', () => ({
  useChordContext: () => ({
    playStyle: 'drone',
    tiltModeEnabled: false,
    noTiltVoicingLevel: 5,
    setNoTiltVoicingLevel: vi.fn(),
    noTiltPositionLevel: 4,
    setNoTiltPositionLevel: vi.fn(),
    selectedChord: {
      name: 'Branch',
      pitches: [58, 62, 65, 69],
      rootPositionIndex: 0,
      quality: ' maj6',
      traditionalName: 'Bb maj6',
      originalPitches: [58, 62, 65, 69],
    },
    tonalCenter: 10,
    octaveRange: 2,
    borrowingState: {
      circlePositions: { 1: 'line', 2: 'line', 3: 'line', 4: 'line' },
      noteStates: { 1: 'on', 2: 'on', 3: 'on', 4: 'on' },
      borrowingDirections: { 1: null, 2: null, 3: null, 4: null },
      active: false,
      chordName: 'Branch',
    },
    previousPlayedChord: null,
    voiceLeadingMode: 'smooth',
    lastTapTilt: { x: 0, y: 0 },
    smoothBaseParallel: 0,
    lastPlayedVoicingLabel: null,
    lastPlayedBassLabel: null,
    lastElementalPlayback: null,
    isNoTiltVoicingLocked: false,
    isNoTiltBassLocked: true,
    toggleNoTiltVoicingLock,
    toggleNoTiltBassLock,
  }),
}));

vi.mock('../context/TiltReadoutContext', () => ({
  useTiltReadoutContext: () => ({
    tiltStatus: 'unsupported',
    tiltSample: { x: 0, y: 0 },
    requestTiltPermission: vi.fn(),
  }),
}));

describe('DiagramVoicingOverlay locks', () => {
  it('renders lock buttons in no-tilt mode', () => {
    render(<DiagramVoicingOverlay />);
    expect(
      screen.getByRole('button', { name: 'Lock voicing for Branch' })
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Unlock bass for Branch' })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls lock toggles when buttons are clicked', () => {
    render(<DiagramVoicingOverlay />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Lock voicing for Branch' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Unlock bass for Branch' })
    );
    expect(toggleNoTiltVoicingLock).toHaveBeenCalledTimes(1);
    expect(toggleNoTiltBassLock).toHaveBeenCalledTimes(1);
  });
});
