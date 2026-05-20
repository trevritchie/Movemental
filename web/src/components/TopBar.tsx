import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { NOTE_NAMES_FLAT, VOICING_TO_INDICES } from '../music/config';
import { audioEngine } from '../audio/AudioEngine';

interface TopBarProps {
  tonalCenter: number;
  setTonalCenter: (val: number) => void;
  voicing: string;
  setVoicing: (val: string) => void;
  octaveRange: number;
  setOctaveRange: (val: number) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  tonalCenter,
  setTonalCenter,
  voicing,
  setVoicing,
  octaveRange,
  setOctaveRange
}) => {
  const [muted, setMuted] = React.useState(false);
  
  const handleVolumeToggle = () => {
    if (muted) {
      audioEngine.setVolume(-5);
      setMuted(false);
    } else {
      audioEngine.setVolume(-Infinity);
      setMuted(true);
    }
  };

  return (
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

        <button 
          className="borrow-btn" 
          onClick={handleVolumeToggle}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </div>
  );
};
