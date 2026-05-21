import React from 'react';
import { Volume2, VolumeX, SlidersHorizontal } from 'lucide-react';
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
    playingMode, setPlayingMode
  } = useChordContext();
  
  const [muted, setMuted] = React.useState(false);
  const [showEffects, setShowEffects] = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<'idle' | 'playing' | 'ok' | 'error'>('idle');
  
  const handleVolumeToggle = () => {
    if (muted) {
      audioEngine.setVolume(-4);
      setMuted(false);
    } else {
      audioEngine.setVolume(-Infinity);
      setMuted(true);
    }
  };

  const handleTestAudio = async () => {
    setTestStatus('playing');
    try {
      // Import Tone dynamically so errors surface clearly
      const Tone = await import('tone');
      // Resume AudioContext (required after user gesture)
      await Tone.start();
      
      // Use a basic synth — no samples, no network, instant
      const synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 1 },
      }).toDestination();
      
      synth.triggerAttackRelease('C4', '1n');
      setTestStatus('ok');
      
      // Clean up after note finishes
      setTimeout(() => {
        synth.dispose();
        setTestStatus('idle');
      }, 3000);
    } catch (err) {
      console.error('Audio test failed:', err);
      setTestStatus('error');
    }
  };

  const testLabel = {
    idle:    '🎹 Test Audio',
    playing: '🔊 Playing…',
    ok:      '✅ Audio OK!',
    error:   '❌ Audio Failed',
  }[testStatus];

  return (
    <div className="top-bar-wrapper">
      <div className="top-bar glass-panel">
        <div className="brand">Movemental</div>
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
            <option value="hold">Hold to Sustain</option>
            <option value="envelope">Preset Envelope</option>
            <option value="infinite">Infinite Drone</option>
          </select>

          <button
            className={`test-audio-btn ${testStatus}`}
            onClick={handleTestAudio}
            disabled={testStatus === 'playing'}
            title="Play a single note to verify audio is working"
          >
            {testLabel}
          </button>

          <button 
            className={`borrow-btn ${showEffects ? 'active' : ''}`} 
            onClick={() => setShowEffects(!showEffects)}
            title="Synthesizer Effects Panel"
            aria-label="Toggle effects settings panel"
          >
            <SlidersHorizontal size={18} />
          </button>

          <button 
            className="borrow-btn" 
            onClick={handleVolumeToggle}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
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
    </div>
  );
};
