import React from 'react';
import { SlidersHorizontal, Square } from 'lucide-react';
import { NOTE_NAMES_FLAT, VOICING_TO_INDICES } from '../music/config';
import { audioEngine } from '../audio/AudioEngine';
import { useChordContext, type PlayingMode } from '../context/ChordContext';

export const TopBar: React.FC = () => {
  const {
    tonalCenter, setTonalCenter,
    voicing, setVoicing,
    octaveRange, setOctaveRange,
    chorusWet, setChorusWet,
    delayWet, setDelayWet,
    reverbWet, setReverbWet,
    playingMode, setPlayingMode,
    envelopeAttack, setEnvelopeAttack,
    envelopeDecay, setEnvelopeDecay,
    envelopeSustain, setEnvelopeSustain,
    envelopeRelease, setEnvelopeRelease
  } = useChordContext();
  
  const [showEffects, setShowEffects] = React.useState(false);
  const [showADSR, setShowADSR] = React.useState(true);

  // Dynamic coordinates for ADSR envelope SVG (viewBox 0 0 240 80)
  const x0 = 10;
  const y0 = 70;
  
  const wA = 15 + (envelopeAttack / 2.0) * 55;   // Attack width (15 to 70px)
  const wD = 15 + (envelopeDecay / 3.0) * 55;    // Decay width (15 to 70px)
  const wS = 40;                                 // Sustain width (fixed 40px)
  const wR = 15 + (envelopeRelease / 4.0) * 55;  // Release width (15 to 70px)
  
  const x1 = x0 + wA;
  const y1 = 15; // Peak level height
  
  const x2 = x1 + wD;
  const y2 = 70 - (envelopeSustain * 55); // Sustain level height (sustain 0 to 1)
  
  const x3 = x2 + wS;
  const y3 = y2;
  
  const x4 = x3 + wR;
  const y4 = 70; // Silence release
  
  const strokePath = `M ${x0},${y0} L ${x1},${y1} L ${x2},${y2} L ${x3},${y3} L ${x4},${y4}`;
  const fillPath = `M ${x0},70 L ${x1},${y1} L ${x2},${y2} L ${x3},${y3} L ${x4},70 Z`;

  // Calculate dynamic stop percentages for Gemini color gradient
  const totalWidth = x4 - x0;
  const p1 = totalWidth > 0 ? ((x1 - x0) / totalWidth) * 100 : 0;
  const p2 = totalWidth > 0 ? ((x2 - x0) / totalWidth) * 100 : 0;
  const p3 = totalWidth > 0 ? ((x3 - x0) / totalWidth) * 100 : 0;

  return (
    <div className="top-bar-wrapper">
      <div className="top-bar glass-panel">
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
            value={voicing} 
            onChange={(e) => setVoicing(e.target.value)}
            title="Voicing"
          >
            {Object.keys(VOICING_TO_INDICES).map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          
          <select 
            value={octaveRange} 
            onChange={(e) => setOctaveRange(Number(e.target.value))}
            title="Octave Range"
          >
            {[1, 2, 3, 4, 5, 6].map(o => (
              <option key={o} value={o}>Octave {o}</option>
            ))}
          </select>

          <select 
            value={playingMode} 
            onChange={(e) => setPlayingMode(e.target.value as PlayingMode)}
            title="Playing Mode"
          >
            <option value="adsr">Click and Hold</option>
            <option value="infinite">Drone</option>
          </select>

          {playingMode === 'infinite' && (
            <button
              className="stop-btn"
              onClick={() => audioEngine.releaseActiveNotes()}
              title="Stop all active drone notes"
            >
              <Square size={12} fill="currentColor" style={{ marginRight: '6px' }} /> Stop
            </button>
          )}

          {playingMode === 'adsr' && (
            <button
              className={`adsr-toggle-btn ${showADSR ? 'active' : ''}`}
              onClick={() => setShowADSR(!showADSR)}
              title="Toggle ADSR Envelope Controls"
            >
              <SlidersHorizontal size={12} style={{ marginRight: '6px' }} /> ADSR
            </button>
          )}

          <button 
            className={`borrow-btn ${showEffects ? 'active' : ''}`} 
            onClick={() => setShowEffects(!showEffects)}
            title="Synthesizer Effects Panel"
            aria-label="Toggle effects settings panel"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>
      
      {showEffects && (
        <div className="effects-panel glass-panel slide-down">
          <div className="effects-title">🎛️ Synthesizer Mastering Effects</div>
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

      {playingMode === 'adsr' && showADSR && (
        <div className="effects-panel adsr-panel glass-panel slide-down">
          <div className="adsr-panel-content">
            <div className="adsr-visualizer">
              <svg className="adsr-svg" viewBox="0 0 240 80">
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
                <line x1="10" y1="15" x2="230" y2="15" stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" />
                <line x1="10" y1="70" x2="230" y2="70" stroke="rgba(255,255,255,0.08)" />
                
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
              <div className="adsr-sliders">
                <div className="effect-slider-group">
                  <label htmlFor="attack-slider">Attack</label>
                  <div className="slider-container">
                    <input 
                      id="attack-slider"
                      type="range" 
                      min="0.01" 
                      max="2.0" 
                      step="0.01" 
                      value={envelopeAttack} 
                      onChange={(e) => setEnvelopeAttack(Number(e.target.value))} 
                    />
                    <span className="slider-val">{envelopeAttack.toFixed(2)}s</span>
                  </div>
                </div>
                
                <div className="effect-slider-group">
                  <label htmlFor="decay-slider">Decay</label>
                  <div className="slider-container">
                    <input 
                      id="decay-slider"
                      type="range" 
                      min="0.01" 
                      max="3.0" 
                      step="0.01" 
                      value={envelopeDecay} 
                      onChange={(e) => setEnvelopeDecay(Number(e.target.value))} 
                    />
                    <span className="slider-val">{envelopeDecay.toFixed(2)}s</span>
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
                      value={envelopeSustain} 
                      onChange={(e) => setEnvelopeSustain(Number(e.target.value))} 
                    />
                    <span className="slider-val">{Math.round(envelopeSustain * 100)}%</span>
                  </div>
                </div>
                
                <div className="effect-slider-group">
                  <label htmlFor="release-slider">Release</label>
                  <div className="slider-container">
                    <input 
                      id="release-slider"
                      type="range" 
                      min="0.01" 
                      max="4.0" 
                      step="0.01" 
                      value={envelopeRelease} 
                      onChange={(e) => setEnvelopeRelease(Number(e.target.value))} 
                    />
                    <span className="slider-val">{envelopeRelease.toFixed(2)}s</span>
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
