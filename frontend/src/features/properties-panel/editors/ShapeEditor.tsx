import React from 'react';
import type { SceneObject } from '../../../store/appStore';

interface Props {
  value: SceneObject;
  onChange: (patch: Partial<SceneObject>) => void;
}

const ShapeEditorComponent: React.FC<Props> = ({ value, onChange }) => {
  void onChange;
  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-400 mb-2">Shape</h4>
      <p className="text-xs text-gray-500">Editor placeholder for shape object {value.id}</p>
    </div>
  );
};

export const ShapeEditor = React.memo(ShapeEditorComponent);
