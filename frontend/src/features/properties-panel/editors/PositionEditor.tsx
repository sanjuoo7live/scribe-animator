import React from 'react';
import { shallow } from 'zustand/shallow';
import { useAppStore } from '../../../store/appStore';
import { clampNumber } from '../validation';
import PROPERTY_RANGES from '../domain/constants';
import { patchSceneObject } from '../domain/patch';

const PositionEditorComponent: React.FC = () => {
  const { id, x, y } = (useAppStore as any)(
    (state: any) => {
      const obj = state.currentProject?.objects.find(
        (o: any) => o.id === state.selectedObject
      );
      return obj ? { id: obj.id, x: obj.x, y: obj.y } : { id: '', x: 0, y: 0 };
    },
    shallow
  ) as { id: string; x: number; y: number };

  const { min: minX, max: maxX } = PROPERTY_RANGES.x;
  const { min: minY, max: maxY } = PROPERTY_RANGES.y;

  const [xLocal, setXLocal] = React.useState(String(x));
  const [yLocal, setYLocal] = React.useState(String(y));

  React.useEffect(() => setXLocal(String(x)), [x]);
  React.useEffect(() => setYLocal(String(y)), [y]);

  const commitX = React.useCallback(() => {
    const val = clampNumber(Number(xLocal), minX, maxX ?? Infinity);
    if (id) patchSceneObject(id, { x: val });
  }, [id, xLocal, minX, maxX]);

  const commitY = React.useCallback(() => {
    const val = clampNumber(Number(yLocal), minY, maxY ?? Infinity);
    if (id) patchSceneObject(id, { y: val });
  }, [id, yLocal, minY, maxY]);

  const handleXChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setXLocal(e.target.value);
    },
    []
  );

  const handleYChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setYLocal(e.target.value);
    },
    []
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block text-xs text-gray-400 mb-1">X</label>
        <input
          type="number"
          value={xLocal}
          onChange={handleXChange}
          onBlur={commitX}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitX();
            }
          }}
          className="w-full p-2 bg-gray-700 text-white rounded text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Y</label>
        <input
          type="number"
          value={yLocal}
          onChange={handleYChange}
          onBlur={commitY}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitY();
            }
          }}
          className="w-full p-2 bg-gray-700 text-white rounded text-sm"
        />
      </div>
    </div>
  );
};

export const PositionEditor = React.memo(PositionEditorComponent);
