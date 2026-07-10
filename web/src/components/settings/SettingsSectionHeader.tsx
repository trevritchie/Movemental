import React from 'react';
import type { SettingsSectionId } from '../../settings/userSettingsSchema';
import { SETTINGS_SECTION_LABELS } from '../../settings/userSettingsSchema';

export interface SettingsSectionHeaderProps {
  sectionId: SettingsSectionId;
  onReset: (sectionId: SettingsSectionId) => void;
}

export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({
  sectionId,
  onReset,
}) => {
  const title = SETTINGS_SECTION_LABELS[sectionId];

  return (
    <div className="settings-menu-section__header">
      <h3 className="settings-menu-section__title">{title}</h3>
      <button
        type="button"
        className="settings-menu-section__reset"
        onClick={() => onReset(sectionId)}
        aria-label={`Reset ${title} to defaults`}
      >
        Reset
      </button>
    </div>
  );
};
