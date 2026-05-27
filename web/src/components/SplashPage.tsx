import React, { useState, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';

interface SplashPageProps {
  onEnter: () => void;
}

export const SplashPage: React.FC<SplashPageProps> = ({ onEnter }) => {
  const [isStarting, setIsStarting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      await audioEngine.startContext();
    } catch (e) {
      console.error("Failed to start audio engine", e);
    }

    // Wait for the fade-out CSS transition (800ms) before unmounting
    setTimeout(() => {
      onEnter();
    }, 800);
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

  return (
    <div
      ref={containerRef}
      className={`splash-container ${isStarting ? 'fade-out' : ''}`}
      onClick={handleStart}
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
        <button
          className="splash-button"
          onClick={(e) => { e.stopPropagation(); handleStart(); }}
          disabled={isStarting}
        >
          Start
        </button>
        <p className="mobile-ringer-warning">
          Please ensure your device's ringer is ON to hear audio.
        </p>
      </div>
    </div>
  );
};
