import React from 'react';
import { useChordContext } from '../../context/ChordContext';
import { DIAGRAM_LAYOUT_OPTIONS } from '../../music/diagramLayouts';
import type { DiagramLayoutMode } from '../../music/sessionModes';

export const DiagramLayoutSelect: React.FC = () => {
  const { diagramLayoutMode, setDiagramLayoutMode } = useChordContext();

  return (
    <select
      className="settings-menu-diagram-layout"
      aria-label="Layout"
      value={diagramLayoutMode}
      onChange={(event) => {
        setDiagramLayoutMode(event.target.value as DiagramLayoutMode);
      }}
    >
      {DIAGRAM_LAYOUT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
