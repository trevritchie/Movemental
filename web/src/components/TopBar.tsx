import React from 'react';
import { SlidersHorizontal, Square } from 'lucide-react';
import { NOTE_NAMES_FLAT } from '../music/config';
import {
  tiltVoicingLevelName,
  tiltInversionLevelName,
  TILT_READOUT_MAX_LABEL,
  TILT_INVERSION_MAX_LABEL,
  TILT_INVERSION_DESKTOP_LABELS,
  TILT_VOICING_LEVEL_NAMES,
  TILT_VOICING_OVERLAY_LABELS,
} from '../music/TiltVoicingEngine';
import { audioEngine } from '../audio/AudioEngine';
import { useChordContext, type PlayStyle } from '../context/ChordContext';
import { useLayoutTier } from '../hooks/useLayoutTier';

export const TopBar: React.FC = () => {
  const {
    tonalCenter, setTonalCenter,
    staticVoicingLevel, setStaticVoicingLevel,
    staticInversionLevel, setStaticInversionLevel,
    octaveRange, setOctaveRange,
    chorusWet, setChorusWet,
    delayWet, setDelayWet,
    reverbWet, setReverbWet,
    playStyle, setPlayStyle,
    envelopeAttack, setEnvelopeAttack,
    envelopeDecay, setEnvelopeDecay,
    envelopeSustain, setEnvelopeSustain,
    envelopeRelease, setEnvelopeRelease,
    droneAttack, setDroneAttack,
    droneDecay, setDroneDecay,
    droneSustain, setDroneSustain,
    droneRelease, setDroneRelease,
    tiltStatus, tiltSample, requestTiltPermission
  } = useChordContext();

  const [showEffects, setShowEffects] = React.useState(false);
  const [showADSR, setShowADSR] = React.useState(false);

  // The tilt style drones, so it shares the drone envelope settings.
  const isDrone = playStyle === 'drone' || playStyle === 'tilt';
  const isTilt = playStyle === 'tilt';
  const isDesktop = useLayoutTier() === 'desktop';
  const isPhone = useLayoutTier() === 'phone';

  // Current values based on mode
  const currentA = isDrone ? droneAttack : envelopeAttack;
  const currentD = isDrone ? droneDecay : envelopeDecay;
  const currentS = isDrone ? droneSustain : envelopeSustain;
  const currentR = isDrone ? droneRelease : envelopeRelease;

  // Dynamic coordinates for ADSR envelope SVG (viewBox 0 0 320 100)
  const x0 = 15;
  const y0 = 85;

  // Custom sound design limits for scaling
  const maxA = isDrone ? 12.0 : 4.0;
  const maxD = isDrone ? 10.0 : 5.0;
  const maxR = isDrone ? 5.0 : 6.0;

  const wA = 20 + (currentA / maxA) * 80;   // Attack width scaled to max
  const wD = 20 + (currentD / maxD) * 80;   // Decay width scaled to max
  const wS = isDrone ? 100 : 50;           // Sustain width (adjusted for drone)
  const wR = 20 + (currentR / maxR) * 80;  // Release width scaled to max

  const x1 = x0 + wA;
  const y1 = 15; // Peak level height

  const x2 = x1 + wD;
  const y2 = y0 - (currentS * 70); // Sustain level height (sustain 0 to 1, height range 70px)

  const x3 = x2 + wS;
  const y3 = y2;

  const x4 = x3 + wR;
  const y4 = y0; // Silence release

  const strokePath = `M ${x0},${y0} L ${x1},${y1} L ${x2},${y2} L ${x3},${y3} L ${x4},${y4}`;
  const fillPath = `M ${x0},${y0} L ${x1},${y1} L ${x2},${y2} L ${x3},${y3} L ${x4},${y0} Z`;

  // Calculate dynamic stop percentages for Gemini color gradient
  const totalWidth = x4 - x0;
  const p1 = totalWidth > 0 ? ((x1 - x0) / totalWidth) * 100 : 0;
  const p2 = totalWidth > 0 ? ((x2 - x0) / totalWidth) * 100 : 0;
  const p3 = totalWidth > 0 ? ((x3 - x0) / totalWidth) * 100 : 0;

  // Dynamically center the envelope in the 320px SVG width
  const svgW = 320;
  const viewBoxX = (totalWidth - svgW) / 2 + x0;
  const dynamicViewBox = `${viewBoxX} 0 ${svgW} 100`;

  return (
    <div className="top-bar-wrapper">
      <div className={`top-bar glass-panel${isPhone ? ' top-bar--phone' : ''}`}>
        <div className="brand">Movemental: Chord Alchemy</div>
        <div className="controls-group">
          <select
            value={tonalCenter}
            onChange={(e) => setTonalCenter(Number(e.target.value))}
            title="Tonal Center"
          >
            {NOTE_NAMES_FLAT.map((note, idx) => (
              <option key={idx} value={idx}>{note}</option>
            ))}
          </select>

          <select
            value={octaveRange}
            onChange={(e) => setOctaveRange(Number(e.target.value))}
            title="Octave Range"
          >
            {[1, 2, 3, 4, 5, 6].map(o => (
              <option key={o} value={o}>
                {`Octave ${o}`}
              </option>
            ))}
          </select>

          {!isPhone && (
            <>
              {isTilt ? (
                <>
                  <div className="voicing-readout-slot">
                    <span
                      className="voicing-readout-slot__sizer"
                      aria-hidden="true"
                    >
                      {TILT_READOUT_MAX_LABEL}
                    </span>
                    {tiltStatus === 'needs-permission' && (
                      <button
                        className="adsr-toggle-btn"
                        onClick={() => requestTiltPermission()}
                        title="Allow access to the motion sensors"
                      >
                        Enable Motion
                      </button>
                    )}
                    {tiltStatus === 'denied' && (
                      <button
                        className="adsr-toggle-btn"
                        onClick={() => requestTiltPermission()}
                        title="Motion access was denied. Tap to retry."
                      >
                        Motion Denied
                      </button>
                    )}
                    {tiltStatus === 'unsupported' && (
                      <span
                        className="tilt-readout"
                        title="This device has no motion sensors; tilt stays flat"
                      >
                        No motion sensors
                      </span>
                    )}
                    {tiltStatus === 'active' && (
                      <span
                        className="tilt-readout"
                        title="Live tilt: roll sets voicing width, pitch selects inversion"
                      >
                        {tiltVoicingLevelName(tiltSample)}
                      </span>
                    )}
                  </div>

                  <div className="voicing-readout-slot">
                    <span
                      className="voicing-readout-slot__sizer"
                      aria-hidden="true"
                    >
                      {TILT_INVERSION_MAX_LABEL}
                    </span>
                    <span
                      className="tilt-readout"
                      title="Pitch tilt selects parallel inversion"
                    >
                      {tiltInversionLevelName(tiltSample)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <select
                    value={staticVoicingLevel}
                    onChange={(e) =>
                      setStaticVoicingLevel(Number(e.target.value))
                    }
                    title="Voicing"
                  >
                    {TILT_VOICING_OVERLAY_LABELS.map((name, idx) => (
                      <option key={TILT_VOICING_LEVEL_NAMES[idx]} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={staticInversionLevel}
                    onChange={(e) =>
                      setStaticInversionLevel(Number(e.target.value))
                    }
                    title="Inversion"
                  >
                    {TILT_INVERSION_DESKTOP_LABELS.map((name, idx) => (
                      <option key={name} value={idx}>{name}</option>
                    ))}
                  </select>

                  <select
                    value={playStyle}
                    onChange={(e) =>
                      setPlayStyle(e.target.value as PlayStyle)
                    }
                    title="Play Style"
                  >
                    <option value="click_and_hold">Click & Hold</option>
                    <option value="drone">Drone</option>
                    {!isDesktop && <option value="tilt">Tilt</option>}
                  </select>
                </>
              )}
            </>
          )}

          <button
            className={`adsr-toggle-btn ${showADSR ? 'active' : ''}`}
            onClick={() => {
              setShowADSR(!showADSR);
              if (!showADSR) setShowEffects(false);
            }}
            title="Envelope Controls"
          >
            <SlidersHorizontal size={12} style={{ marginRight: '6px' }} />
            <span className="adsr-toggle-btn__label">ADSR</span>
          </button>

          <button
            className={`adsr-toggle-btn ${showEffects ? 'active' : ''}`}
            onClick={() => {
              setShowEffects(!showEffects);
              if (!showEffects) setShowADSR(false);
            }}
            title="Synth Effects"
          >
            <SlidersHorizontal size={12} style={{ marginRight: '6px' }} />
            <span className="adsr-toggle-btn__label">FX</span>
          </button>

          <button
            className="stop-btn"
            onClick={() => audioEngine.releaseActiveNotes()}
            title="Panic Switch"
            style={{ padding: '8px', minWidth: '32px' }}
          >
            <Square size={14} fill="currentColor" />
          </button>
        </div>
      </div>

      {showEffects && (
        <div className="effects-panel adsr-panel glass-panel slide-down" style={{ padding: '16px 24px' }}>
          <div className="effects-sliders">
            <div className="effect-slider-group">
              <label htmlFor="chorus-slider">Chorus Intensity</label>
              <div className="slider-container">
                <input
                  id="chorus-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={chorusWet}
                  onChange={(e) => setChorusWet(Number(e.target.value))}
                />
                <span className="slider-val">{Math.round(chorusWet * 100)}%</span>
              </div>
            </div>

            <div className="effect-slider-group">
              <label htmlFor="delay-slider">Delay Echo</label>
              <div className="slider-container">
                <input
                  id="delay-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={delayWet}
                  onChange={(e) => setDelayWet(Number(e.target.value))}
                />
                <span className="slider-val">{Math.round(delayWet * 100)}%</span>
              </div>
            </div>

            <div className="effect-slider-group">
              <label htmlFor="reverb-slider">Reverb Space</label>
              <div className="slider-container">
                <input
                  id="reverb-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={reverbWet}
                  onChange={(e) => setReverbWet(Number(e.target.value))}
                />
                <span className="slider-val">{Math.round(reverbWet * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showADSR && (
        <div className="effects-panel adsr-panel glass-panel slide-down">
          <div className="adsr-panel-content">
            <div className="adsr-visualizer">
              <svg className="adsr-svg" viewBox={dynamicViewBox}>
                <defs>
                  <linearGradient id="gemini-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4285F4" />
                    <stop offset={`${p1}%`} stopColor="#9B72F8" />
                    <stop offset={`${p2}%`} stopColor="#E266F3" />
                    <stop offset={`${p3}%`} stopColor="#74C7F7" />
                    <stop offset="100%" stopColor="#4285F4" />
                  </linearGradient>
                  <filter id="glow-adsr" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                {/* Background grid lines */}
                <line x1="15" y1="15" x2="305" y2="15" stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" />
                <line x1="15" y1="85" x2="305" y2="85" stroke="rgba(255,255,255,0.08)" />

                {/* Filled envelope area */}
                <path d={fillPath} fill="url(#gemini-grad)" fillOpacity={0.15} />
                {/* Glowing envelope stroke */}
                <path d={strokePath} fill="none" stroke="url(#gemini-grad)" strokeWidth="3" filter="url(#glow-adsr)" />

                {/* Color-coded Node dots */}
                <circle cx={x1} cy={y1} r="4.5" fill="#9B72F8" stroke="#ffffff" strokeWidth="1" filter="url(#glow-adsr)" />
                <circle cx={x2} cy={y2} r="4.5" fill="#E266F3" stroke="#ffffff" strokeWidth="1" filter="url(#glow-adsr)" />
                <circle cx={x3} cy={y3} r="4.5" fill="#74C7F7" stroke="#ffffff" strokeWidth="1" filter="url(#glow-adsr)" />
              </svg>
            </div>

            <div className="adsr-sliders-container">
              <div className="adsr-sliders" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="effect-slider-group">
                  <label htmlFor="attack-slider">Attack</label>
                  <div className="slider-container">
                    <input
                      id="attack-slider"
                      type="range"
                      min={isDrone ? 0.1 : 0.01}
                      max={isDrone ? 12.0 : 4.0}
                      step={isDrone ? 0.1 : 0.01}
                      value={currentA}
                      onChange={(e) => isDrone ? setDroneAttack(Number(e.target.value)) : setEnvelopeAttack(Number(e.target.value))}
                    />
                    <span className="slider-val">{currentA.toFixed(2)}s</span>
                  </div>
                </div>

                <div className="effect-slider-group">
                  <label htmlFor="decay-slider">Decay</label>
                  <div className="slider-container">
                    <input
                      id="decay-slider"
                      type="range"
                      min={isDrone ? 0.1 : 0.01}
                      max={isDrone ? 10.0 : 5.0}
                      step={isDrone ? 0.1 : 0.01}
                      value={currentD}
                      onChange={(e) => isDrone ? setDroneDecay(Number(e.target.value)) : setEnvelopeDecay(Number(e.target.value))}
                    />
                    <span className="slider-val">{currentD.toFixed(2)}s</span>
                  </div>
                </div>

                <div className="effect-slider-group">
                  <label htmlFor="sustain-slider">Sustain</label>
                  <div className="slider-container">
                    <input
                      id="sustain-slider"
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.01"
                      value={currentS}
                      onChange={(e) => isDrone ? setDroneSustain(Number(e.target.value)) : setEnvelopeSustain(Number(e.target.value))}
                    />
                    <span className="slider-val">{Math.round(currentS * 100)}%</span>
                  </div>
                </div>

                <div className="effect-slider-group">
                  <label htmlFor="release-slider">Release</label>
                  <div className="slider-container">
                    <input
                      id="release-slider"
                      type="range"
                      min={isDrone ? 0.1 : 0.01}
                      max={isDrone ? 5.0 : 6.0}
                      step={isDrone ? 0.1 : 0.01}
                      value={currentR}
                      onChange={(e) => isDrone ? setDroneRelease(Number(e.target.value)) : setEnvelopeRelease(Number(e.target.value))}
                    />
                    <span className="slider-val">{currentR.toFixed(2)}s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
