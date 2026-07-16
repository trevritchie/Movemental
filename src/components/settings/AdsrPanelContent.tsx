import React from 'react';
import { useChordContext } from '../../context/ChordContext';
import { useSoundDesignContext } from '../../context/SoundDesignContext';

interface AdsrPanelContentProps {
  idPrefix?: string;
  disabled?: boolean;
}

export const AdsrPanelContent: React.FC<AdsrPanelContentProps> = ({
  idPrefix = '',
  disabled: disabledProp,
}) => {
  const { playStyle } = useChordContext();
  const {
    isSamplerAdsrDisabled,
    envelopeAttack,
    setEnvelopeAttack,
    envelopeDecay,
    setEnvelopeDecay,
    envelopeSustain,
    setEnvelopeSustain,
    envelopeRelease,
    setEnvelopeRelease,
    tapAttack,
    setTapAttack,
    tapDecay,
    setTapDecay,
    tapSustain,
    setTapSustain,
    tapRelease,
    setTapRelease,
  } = useSoundDesignContext();

  const isTapMode = playStyle === 'tap';
  const disabled = disabledProp ?? isSamplerAdsrDisabled;

  const currentA = isTapMode ? tapAttack : envelopeAttack;
  const currentD = isTapMode ? tapDecay : envelopeDecay;
  const currentS = isTapMode ? tapSustain : envelopeSustain;
  const currentR = isTapMode ? tapRelease : envelopeRelease;

  const x0 = 15;
  const y0 = 85;

  const maxA = isTapMode ? 12.0 : 4.0;
  const maxD = isTapMode ? 10.0 : 5.0;
  const maxR = isTapMode ? 5.0 : 6.0;

  const wA = 20 + (currentA / maxA) * 80;
  const wD = 20 + (currentD / maxD) * 80;
  const wS = isTapMode ? 100 : 50;
  const wR = 20 + (currentR / maxR) * 80;

  const x1 = x0 + wA;
  const y1 = 15;

  const x2 = x1 + wD;
  const y2 = y0 - currentS * 70;

  const x3 = x2 + wS;
  const y3 = y2;

  const x4 = x3 + wR;
  const y4 = y0;

  const strokePath =
    `M ${x0},${y0} L ${x1},${y1} L ${x2},${y2} ` +
    `L ${x3},${y3} L ${x4},${y4}`;
  const fillPath =
    `M ${x0},${y0} L ${x1},${y1} L ${x2},${y2} ` +
    `L ${x3},${y3} L ${x4},${y0} Z`;

  const totalWidth = x4 - x0;
  const p1 = totalWidth > 0 ? ((x1 - x0) / totalWidth) * 100 : 0;
  const p2 = totalWidth > 0 ? ((x2 - x0) / totalWidth) * 100 : 0;
  const p3 = totalWidth > 0 ? ((x3 - x0) / totalWidth) * 100 : 0;

  const svgW = 320;
  const viewBoxX = (totalWidth - svgW) / 2 + x0;
  const dynamicViewBox = `${viewBoxX} 0 ${svgW} 100`;

  const gradId = `${idPrefix}gemini-grad`;
  const glowId = `${idPrefix}glow-adsr`;
  const attackId = `${idPrefix}attack-slider`;
  const decayId = `${idPrefix}decay-slider`;
  const sustainId = `${idPrefix}sustain-slider`;
  const releaseId = `${idPrefix}release-slider`;

  return (
    <div className={`adsr-panel-content${disabled ? ' adsr-panel-content--disabled' : ''}`}>
      {disabled && (
        <p className="settings-menu-section__hint">
          Envelope is disabled for sampled instruments in Tap mode. Switch to
          Tap & Hold to shape attack and release on timed previews.
        </p>
      )}
      <div className="adsr-visualizer">
        <svg className="adsr-svg" viewBox={dynamicViewBox}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4285F4" />
              <stop offset={`${p1}%`} stopColor="#9B72F8" />
              <stop offset={`${p2}%`} stopColor="#E266F3" />
              <stop offset={`${p3}%`} stopColor="#74C7F7" />
              <stop offset="100%" stopColor="#4285F4" />
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <line
            x1="15"
            y1="15"
            x2="305"
            y2="15"
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="3,3"
          />
          <line
            x1="15"
            y1="85"
            x2="305"
            y2="85"
            stroke="rgba(255,255,255,0.08)"
          />
          <path
            d={fillPath}
            fill={`url(#${gradId})`}
            fillOpacity={0.15}
          />
          <path
            d={strokePath}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="3"
            filter={`url(#${glowId})`}
          />
          <circle
            cx={x1}
            cy={y1}
            r="4.5"
            fill="#9B72F8"
            stroke="#ffffff"
            strokeWidth="1"
            filter={`url(#${glowId})`}
          />
          <circle
            cx={x2}
            cy={y2}
            r="4.5"
            fill="#E266F3"
            stroke="#ffffff"
            strokeWidth="1"
            filter={`url(#${glowId})`}
          />
          <circle
            cx={x3}
            cy={y3}
            r="4.5"
            fill="#74C7F7"
            stroke="#ffffff"
            strokeWidth="1"
            filter={`url(#${glowId})`}
          />
        </svg>
      </div>

      <div className={`adsr-sliders-container${disabled ? ' adsr-sliders--disabled' : ''}`}>
        <div className="adsr-sliders">
          <div className="effect-slider-group">
            <label htmlFor={attackId}>Attack</label>
            <div className="slider-container">
              <input
                id={attackId}
                type="range"
                min={isTapMode ? 0.1 : 0.01}
                max={isTapMode ? 12.0 : 4.0}
                step={isTapMode ? 0.1 : 0.01}
                value={currentA}
                disabled={disabled}
                onChange={(e) =>
                  isTapMode
                    ? setTapAttack(Number(e.target.value))
                    : setEnvelopeAttack(Number(e.target.value))
                }
              />
              <span className="slider-val">{currentA.toFixed(2)}s</span>
            </div>
          </div>

          <div className="effect-slider-group">
            <label htmlFor={decayId}>Decay</label>
            <div className="slider-container">
              <input
                id={decayId}
                type="range"
                min={isTapMode ? 0.1 : 0.01}
                max={isTapMode ? 10.0 : 5.0}
                step={isTapMode ? 0.1 : 0.01}
                value={currentD}
                disabled={disabled}
                onChange={(e) =>
                  isTapMode
                    ? setTapDecay(Number(e.target.value))
                    : setEnvelopeDecay(Number(e.target.value))
                }
              />
              <span className="slider-val">{currentD.toFixed(2)}s</span>
            </div>
          </div>

          <div className="effect-slider-group">
            <label htmlFor={sustainId}>Sustain</label>
            <div className="slider-container">
              <input
                id={sustainId}
                type="range"
                min="0.0"
                max="1.0"
                step="0.01"
                value={currentS}
                disabled={disabled}
                onChange={(e) =>
                  isTapMode
                    ? setTapSustain(Number(e.target.value))
                    : setEnvelopeSustain(Number(e.target.value))
                }
              />
              <span className="slider-val">{Math.round(currentS * 100)}%</span>
            </div>
          </div>

          <div className="effect-slider-group">
            <label htmlFor={releaseId}>Release</label>
            <div className="slider-container">
              <input
                id={releaseId}
                type="range"
                min={isTapMode ? 0.1 : 0.01}
                max={isTapMode ? 5.0 : 6.0}
                step={isTapMode ? 0.1 : 0.01}
                value={currentR}
                disabled={disabled}
                onChange={(e) =>
                  isTapMode
                    ? setTapRelease(Number(e.target.value))
                    : setEnvelopeRelease(Number(e.target.value))
                }
              />
              <span className="slider-val">{currentR.toFixed(2)}s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
