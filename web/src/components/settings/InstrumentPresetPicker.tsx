import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useChordContext } from '../../context/ChordContext';
import {
  getSynthPreset,
  isSamplerPreset,
  SAMPLER_ENGINE_PRESETS,
  SYNTH_ENGINE_PRESETS,
  type SynthPreset,
} from '../../audio/synthPresets';

export const InstrumentPresetPicker: React.FC = () => {
  const {
    synthPresetId,
    setSynthPresetId,
    synthPresetLoading,
  } = useChordContext();

  const loadingSampler = synthPresetLoading &&
    isSamplerPreset(getSynthPreset(synthPresetId));

  return (
    <div className="instrument-preset-picker">
      <InstrumentPresetSection
        title="Synthesized"
        presets={SYNTH_ENGINE_PRESETS}
        synthPresetId={synthPresetId}
        synthPresetLoading={synthPresetLoading}
        onSelect={setSynthPresetId}
      />
      <InstrumentPresetSection
        title="Sampled"
        presets={SAMPLER_ENGINE_PRESETS}
        synthPresetId={synthPresetId}
        synthPresetLoading={synthPresetLoading}
        onSelect={setSynthPresetId}
        className="instrument-preset-section--sampled"
      />
      <p className="settings-menu-section__hint">
        {loadingSampler
          ? 'Loading instrument samples. This may take a few seconds on first use.'
          : 'Changing instrument resets envelope and effect defaults for that preset. You can still tweak them afterward.'}
      </p>
    </div>
  );
};

interface InstrumentPresetSectionProps {
  title: string;
  presets: SynthPreset[];
  synthPresetId: string;
  synthPresetLoading: boolean;
  onSelect: (id: string) => void;
  className?: string;
}

const InstrumentPresetSection: React.FC<InstrumentPresetSectionProps> = ({
  title,
  presets,
  synthPresetId,
  synthPresetLoading,
  onSelect,
  className,
}) => (
  <section
    className={`instrument-preset-section${className ? ` ${className}` : ''}`}
    aria-label={title}
  >
    <h4 className="instrument-preset-section__title">{title}</h4>
    <div
      className="instrument-preset-grid"
      role="group"
      aria-label={`${title} instruments`}
      aria-busy={synthPresetLoading}
    >
      {presets.map((preset) => {
        const isSelected = synthPresetId === preset.id;
        const isLoading = isSelected && synthPresetLoading;
        return (
          <button
            key={preset.id}
            type="button"
            className={`instrument-preset-btn${isSelected ? ' active' : ''}`}
            onClick={() => onSelect(preset.id)}
            aria-pressed={isSelected}
            disabled={synthPresetLoading}
          >
            <span className="instrument-preset-btn__label">{preset.name}</span>
            {isLoading ? (
              <Loader2
                size={15}
                strokeWidth={2.5}
                className="instrument-preset-btn__check instrument-preset-btn__spinner"
                aria-hidden="true"
              />
            ) : isSelected ? (
              <Check
                size={15}
                strokeWidth={2.5}
                className="instrument-preset-btn__check"
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  </section>
);
