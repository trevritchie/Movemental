import React, { useCallback, useMemo } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useSoundDesignContext } from '../../context/SoundDesignContext';
import { groupSamplerPresetsByCategory } from '../../audio/samplerInstrumentCategories';
import {
  SAMPLER_ENGINE_PRESETS,
  SYNTH_ENGINE_PRESETS,
  type SynthPreset,
} from '../../audio/synthPresets';

export interface InstrumentPresetPickerProps {
  onPresetSelect?: (id: string) => void;
}

export const InstrumentPresetPicker: React.FC<InstrumentPresetPickerProps> = ({
  onPresetSelect,
}) => {
  const {
    synthPresetId,
    setSynthPresetId,
    synthPresetLoading,
  } = useSoundDesignContext();

  const handleSelect = useCallback(
    (id: string) => {
      if (onPresetSelect) {
        onPresetSelect(id);
        return;
      }
      setSynthPresetId(id);
    },
    [onPresetSelect, setSynthPresetId],
  );

  const sampledCategories = useMemo(
    () => groupSamplerPresetsByCategory(SAMPLER_ENGINE_PRESETS),
    [],
  );

  return (
    <div className="instrument-preset-picker">
      <InstrumentPresetSection
        title="Synthesized"
        presets={SYNTH_ENGINE_PRESETS}
        synthPresetId={synthPresetId}
        synthPresetLoading={synthPresetLoading}
        onSelect={handleSelect}
      />
      <section
        className="instrument-preset-section instrument-preset-section--sampled"
        aria-label="Sampled"
      >
        <h4 className="instrument-preset-section__title">Sampled</h4>
        <div
          className="instrument-preset-categories"
          aria-busy={synthPresetLoading}
        >
          {sampledCategories.map((group) => (
            <div
              key={group.category.id}
              className="instrument-preset-category"
            >
              <p className="instrument-preset-category__label">
                {group.category.label}
              </p>
              <InstrumentPresetGrid
                presets={group.presets}
                groupLabel={group.category.label}
                synthPresetId={synthPresetId}
                synthPresetLoading={synthPresetLoading}
                onSelect={handleSelect}
              />
            </div>
          ))}
        </div>
      </section>
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
    <InstrumentPresetGrid
      presets={presets}
      groupLabel={title}
      synthPresetId={synthPresetId}
      synthPresetLoading={synthPresetLoading}
      onSelect={onSelect}
    />
  </section>
);

interface InstrumentPresetGridProps {
  presets: SynthPreset[];
  groupLabel: string;
  synthPresetId: string;
  synthPresetLoading: boolean;
  onSelect: (id: string) => void;
}

const InstrumentPresetGrid: React.FC<InstrumentPresetGridProps> = ({
  presets,
  groupLabel,
  synthPresetId,
  synthPresetLoading,
  onSelect,
}) => (
  <div
    className="instrument-preset-grid"
    role="group"
    aria-label={`${groupLabel} instruments`}
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
);
