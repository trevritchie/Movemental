import React from 'react';
import {
  SETTINGS_RESET_GROUP_LABELS,
  type SettingsResetGroupId,
} from '../../settings/settingsResetGroups';

export interface SettingsSettingHeaderProps {
  groupId: SettingsResetGroupId;
  onReset: (groupId: SettingsResetGroupId) => void;
}

export const SettingsSettingHeader: React.FC<SettingsSettingHeaderProps> = ({
  groupId,
  onReset,
}) => {
  const title = SETTINGS_RESET_GROUP_LABELS[groupId];

  return (
    <div className="settings-menu-section__header">
      <h4 className="settings-menu-section__title">{title}</h4>
      <button
        type="button"
        className="settings-menu-section__reset"
        onClick={() => onReset(groupId)}
        aria-label={`Reset ${title} to defaults`}
      >
        Reset
      </button>
    </div>
  );
};
