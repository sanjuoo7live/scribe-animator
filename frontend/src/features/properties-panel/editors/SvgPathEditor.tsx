import React from 'react';
import type { SceneObject } from '../../../store/appStore';
import { FEATURE_FLAGS } from '../domain/flags';

interface Props {
  value: SceneObject;
  onChange: (patch: Partial<SceneObject>) => void;
}

const SvgPathEditorComponent: React.FC<Props> = ({ value, onChange }) => {
  void onChange;
  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-400 mb-2">SVG Path</h4>
      <p className="text-xs text-gray-500">Editor placeholder for SVG path object {value.id}</p>
      {FEATURE_FLAGS.handSmoothing && (
        <p className="text-xs text-gray-500">Hand smoothing enabled</p>
      )}
      {/* TODO: hand follower/calibrator will be lazy-loaded in later phases */}
    </div>
  );
};

export const SvgPathEditor = React.memo(SvgPathEditorComponent);
