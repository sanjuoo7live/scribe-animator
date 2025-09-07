import React from 'react';
import type { SceneObject } from '../../../store/appStore';

interface Props {
  value: SceneObject;
  onChange: (patch: Partial<SceneObject>) => void;
}

const AnimationEditorComponent: React.FC<Props> = ({ value, onChange }) => {
  void onChange;
  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-400 mb-2">Animation</h4>
      <p className="text-xs text-gray-500">Editor placeholder for animation on {value.id}</p>
      {/* TODO: animation type policy will live in schema/normalization */}
    </div>
  );
};

export const AnimationEditor = React.memo(AnimationEditorComponent);
