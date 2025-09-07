import React from 'react';
import { shallow } from 'zustand/shallow';
import { useAppStore } from '../../../store/appStore';
import PROPERTY_RANGES from '../domain/constants';
import { clampNumber } from '../validation';
import { patchSceneObject } from '../domain/patch';

const ImageEditorComponent: React.FC = () => {
  const { id, width, height, opacity } = (useAppStore as any)(
    (state: any) => {
      const obj = state.currentProject?.objects.find(
        (o: any) => o.id === state.selectedObject
      );
      if (!obj || obj.type !== 'image')
        return { id: '', width: 0, height: 0, opacity: 1 };
      return {
        id: obj.id,
        width: obj.width ?? 0,
        height: obj.height ?? 0,
        opacity: obj.properties?.opacity ?? 1,
      };
    },
    shallow
  ) as { id: string; width: number; height: number; opacity: number };

  const [widthLocal, setWidthLocal] = React.useState(String(width));
  const [heightLocal, setHeightLocal] = React.useState(String(height));
  React.useEffect(() => setWidthLocal(String(width)), [width]);
  React.useEffect(() => setHeightLocal(String(height)), [height]);

  const commitWidth = React.useCallback(() => {
    const val = clampNumber(
      Number(widthLocal),
      PROPERTY_RANGES.width.min,
      PROPERTY_RANGES.width.max ?? Infinity
    );
    if (id) patchSceneObject(id, { width: val });
  }, [id, widthLocal]);

  const commitHeight = React.useCallback(() => {
    const val = clampNumber(
      Number(heightLocal),
      PROPERTY_RANGES.height.min,
      PROPERTY_RANGES.height.max ?? Infinity
    );
    if (id) patchSceneObject(id, { height: val });
  }, [id, heightLocal]);

  const handleWidthChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setWidthLocal(e.target.value),
    []
  );

  const handleHeightChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setHeightLocal(e.target.value),
    []
  );

  const handleOpacity = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (id) patchSceneObject(id, { properties: { opacity: val } });
    },
    [id]
  );

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-400 mb-2">Image</h4>
      <div className="grid grid-cols-2" style={{ columnGap: 8, rowGap: 8 }}>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Width</label>
          <input
            type="number"
            value={widthLocal}
            onChange={handleWidthChange}
            onBlur={commitWidth}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitWidth();
              }
            }}
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Height</label>
          <input
            type="number"
            value={heightLocal}
            onChange={handleHeightChange}
            onBlur={commitHeight}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitHeight();
              }
            }}
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Opacity</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={handleOpacity}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export const ImageEditor = React.memo(ImageEditorComponent);
