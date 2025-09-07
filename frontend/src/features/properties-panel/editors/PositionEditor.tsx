import React from 'react';
import type { SceneObject } from '../../../store/appStore';
import { clampNumber } from '../validation';
import PROPERTY_RANGES from '../domain/constants';

interface Props {
  value: SceneObject;
  onChange: (patch: Partial<SceneObject>) => void;
}

const PositionEditorComponent: React.FC<Props> = ({ value, onChange }) => {
  const { min: minX, max: maxX } = PROPERTY_RANGES.x;
  const { min: minY, max: maxY } = PROPERTY_RANGES.y;
  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-400 mb-2">Position</h4>
      <div className="grid grid-cols-2" style={{ columnGap: 8, rowGap: 8 }}>
        <div>
          <label className="block text-xs text-gray-400 mb-1">X</label>
          <input
            type="number"
            value={value.x}
            onChange={(e) =>
              onChange({ x: clampNumber(Number(e.target.value), minX, maxX) })
            }
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Y</label>
          <input
            type="number"
            value={value.y}
            onChange={(e) =>
              onChange({ y: clampNumber(Number(e.target.value), minY, maxY) })
            }
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export const PositionEditor = React.memo(PositionEditorComponent);
