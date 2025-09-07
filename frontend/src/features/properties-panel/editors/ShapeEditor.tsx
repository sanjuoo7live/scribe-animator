import React from 'react';
import { shallow } from 'zustand/shallow';
import { useAppStore } from '../../../store/appStore';
import PROPERTY_RANGES from '../domain/constants';
import { clampNumber } from '../validation';
import { patchSceneObject } from '../domain/patch';

const ShapeEditorComponent: React.FC = () => {
  const {
    id,
    width,
    height,
    fill,
    stroke,
    strokeWidth,
  } = (useAppStore as any)(
    (state: any) => {
      const obj = state.currentProject?.objects.find(
        (o: any) => o.id === state.selectedObject
      );
      if (!obj || obj.type !== 'shape')
        return {
          id: '',
          width: 0,
          height: 0,
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidth: 2,
        };
      return {
        id: obj.id,
        width: obj.width ?? 0,
        height: obj.height ?? 0,
        fill: obj.properties?.fill || '#ffffff',
        stroke: obj.properties?.stroke || '#000000',
        strokeWidth: obj.properties?.strokeWidth ?? 2,
      };
    },
    shallow
  ) as {
    id: string;
    width: number;
    height: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
  };

  const [fillLocal, setFillLocal] = React.useState(fill);
  const [strokeLocal, setStrokeLocal] = React.useState(stroke);
  const [widthLocal, setWidthLocal] = React.useState(String(width));
  const [heightLocal, setHeightLocal] = React.useState(String(height));
  React.useEffect(() => setFillLocal(fill), [fill]);
  React.useEffect(() => setStrokeLocal(stroke), [stroke]);
  React.useEffect(() => setWidthLocal(String(width)), [width]);
  React.useEffect(() => setHeightLocal(String(height)), [height]);

  const fillTimer = React.useRef<NodeJS.Timeout | null>(null);
  const strokeTimer = React.useRef<NodeJS.Timeout | null>(null);

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

  const handleStrokeWidth = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = clampNumber(
        Number(e.target.value),
        PROPERTY_RANGES.strokeWidth.min,
        PROPERTY_RANGES.strokeWidth.max ?? Infinity
      );
      if (id) patchSceneObject(id, { properties: { strokeWidth: val } });
    },
    [id]
  );

  const handleFill = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setFillLocal(val);
      if (fillTimer.current) clearTimeout(fillTimer.current);
      fillTimer.current = setTimeout(() => {
        if (id) patchSceneObject(id, { properties: { fill: val } });
      }, 100);
    },
    [id]
  );

  const handleStroke = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setStrokeLocal(val);
      if (strokeTimer.current) clearTimeout(strokeTimer.current);
      strokeTimer.current = setTimeout(() => {
        if (id) patchSceneObject(id, { properties: { stroke: val } });
      }, 100);
    },
    [id]
  );

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-400 mb-2">Shape</h4>
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
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fill</label>
          <input type="color" value={fillLocal} onChange={handleFill} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Stroke</label>
          <input type="color" value={strokeLocal} onChange={handleStroke} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Stroke Width</label>
          <input
            type="range"
            min={PROPERTY_RANGES.strokeWidth.min}
            max={PROPERTY_RANGES.strokeWidth.max}
            step={PROPERTY_RANGES.strokeWidth.step}
            value={strokeWidth}
            onChange={handleStrokeWidth}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export const ShapeEditor = React.memo(ShapeEditorComponent);
