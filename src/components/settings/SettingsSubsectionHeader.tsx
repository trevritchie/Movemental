import React from 'react';
import type { SettingsSectionId } from '../../settings/userSettingsSchema';
import { SETTINGS_SECTION_LABELS } from '../../settings/userSettingsSchema';

export interface SettingsSubsectionHeaderProps {
  sectionId: SettingsSectionId;
  onReset: (sectionId: SettingsSectionId) => void;
}

export const SettingsSubsectionHeader: React.FC<SettingsSubsectionHeaderProps> = ({
  sectionId,
  onReset,
}) => {
  const title = SETTINGS_SECTION_LABELS[sectionId];

  return (
    <div className="settings-menu-subsection__header-row">
      <h4 className="settings-menu-field__label settings-menu-subsection__header">
        {title}
      </h4>
      <button
        type="button"
        className="settings-menu-subsection__reset"
        onClick={() => onReset(sectionId)}
        aria-label={`Reset ${title} to defaults`}
      >
        Reset
      </button>
    </div>
  );
};
