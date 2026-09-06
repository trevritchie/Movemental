import React, { useState, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import {
  unlockIosMediaChannel,
  waitForIosMediaChannel,
} from '../audio/iosMediaChannel';
import { useChordContext } from '../context/ChordContext';
import { useTiltReadoutContext } from '../context/TiltReadoutContext';
import { useLayoutTier } from '../hooks/useLayoutTier';

interface SplashPageProps {
  onEnter: () => void;
}

type OnboardingStep = 'tilt_choice' | 'tilt_to_strum';

export const SplashPage: React.FC<SplashPageProps> = ({ onEnter }) => {
  const [isStarting, setIsStarting] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('tilt_choice');
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    enterTiltSession,
    enterNoTiltSession,
    tiltModeEnabled,
    setTiltToStrum,
    hasPersistedSettings,
  } = useChordContext();
  const { requestTiltPermission } = useTiltReadoutContext();
  const layoutTier = useLayoutTier();
  const isDesktop = layoutTier === 'desktop';

  const handleStart = () => {
    if (isStarting) return;
    setIsStarting(true);

    unlockIosMediaChannel();

    void (async () => {
      try {
        await waitForIosMediaChannel();
        await audioEngine.startContext();
      } catch (e) {
        console.error('Failed to start audio engine', e);
      }

      setTimeout(() => {
        onEnter();
      }, 800);
    })();
  };

  const handleReturningStart = () => {
    if (isStarting) return;
    if (!isDesktop && tiltModeEnabled) {
      void requestTiltPermission();
      enterTiltSession();
    } else {
      enterNoTiltSession();
    }
    handleStart();
  };

  const handlePickTilt = () => {
    if (isStarting) return;
    // Must run inside the tap gesture: iOS only grants motion access from a
    // user-initiated call.
    void requestTiltPermission();
    enterTiltSession();
    setOnboardingStep('tilt_to_strum');
  };

  const handlePickNoTilt = () => {
    if (isStarting) return;
    enterNoTiltSession();
    handleStart();
  };

  const handlePickTiltToStrum = (enabled: boolean) => {
    if (isStarting) return;
    setTiltToStrum(enabled);
    handleStart();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const { clientX, clientY } = e;
      const xRatio = clientX / window.innerWidth;
      const yRatio = clientY / window.innerHeight;
      containerRef.current.style.setProperty('--mouse-x', `${clientX}px`);
      containerRef.current.style.setProperty('--mouse-y', `${clientY}px`);
      containerRef.current.style.setProperty('--mouse-x-ratio', `${xRatio}`);
      containerRef.current.style.setProperty('--mouse-y-ratio', `${yRatio}`);
    }
  };

  const showSingleStart = isDesktop || hasPersistedSettings;

  return (
    <div
      ref={containerRef}
      className={`splash-container ${isStarting ? 'fade-out' : ''}`}
      onClick={isDesktop ? handleReturningStart : undefined}
      onMouseMove={handleMouseMove}
    >
      <div className="splash-background">
        <div className="mouse-follower">
          <div className="orb-wrapper">
            <div className="glow-orb orb-1" />
            <div className="glow-orb orb-2" />
            <div className="glow-orb orb-3" />
          </div>
        </div>
        <div className="glow-orb orb-mouse" />
      </div>
      <div className="splash-content">
        <h1 className="splash-title">Movemental</h1>
        {showSingleStart ? (
          <button
            className="splash-button"
            onClick={(e) => {
              e.stopPropagation();
              handleReturningStart();
            }}
            disabled={isStarting}
          >
            Start
          </button>
        ) : onboardingStep === 'tilt_choice' ? (
          <div className="splash-prompt">
            <h2 className="splash-prompt-title">How would you like to play?</h2>
            <div className="splash-prompt-options">
              <button
                type="button"
                className="splash-prompt-card"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePickTilt();
                }}
                disabled={isStarting}
              >
                <span className="splash-prompt-card__label">Tilt</span>
                <span className="splash-prompt-card__desc">
                  Tilt your device to change chord voicings in real time.
                </span>
              </button>
              <button
                type="button"
                className="splash-prompt-card"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePickNoTilt();
                }}
                disabled={isStarting}
              >
                <span className="splash-prompt-card__label">No Tilt</span>
                <span className="splash-prompt-card__desc">
                  Change chord voicings and select bass notes using on-screen touch controls.
                </span>
              </button>
            </div>
            <p className="splash-prompt-hint">
              You can change this anytime in Settings.
            </p>
          </div>
        ) : (
          <div className="splash-prompt">
            <h2 className="splash-prompt-title">Enable Tilt to Strum?</h2>
            <div className="splash-prompt-options">
              <button
                type="button"
                className="splash-prompt-card"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePickTiltToStrum(true);
                }}
                disabled={isStarting}
              >
                <span className="splash-prompt-card__label">On</span>
                <span className="splash-prompt-card__desc">
                  Chords retrigger automatically as you tilt your device.
                </span>
              </button>
              <button
                type="button"
                className="splash-prompt-card"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePickTiltToStrum(false);
                }}
                disabled={isStarting}
              >
                <span className="splash-prompt-card__label">Off</span>
                <span className="splash-prompt-card__desc">
                  Chords only play when tapped. Tilting changes chord voicings for your next tap.
                </span>
              </button>
            </div>
            <p className="splash-prompt-hint">
              You can change this anytime in Settings.
            </p>
            <button
              type="button"
              className="splash-prompt-back"
              onClick={(e) => {
                e.stopPropagation();
                setOnboardingStep('tilt_choice');
              }}
              disabled={isStarting}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
