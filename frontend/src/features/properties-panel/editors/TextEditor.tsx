import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../../store/appStore';
import PROPERTY_RANGES from '../domain/constants';
import { clampNumber } from '../validation';
import { patchSceneObject } from '../domain/patch';
import useThrottledCallback from '../hooks/useThrottledCallback';
import { isIconText } from '../utils/iconDetection';
import { FONT_FAMILIES } from '../../../constants/fonts';

const TextEditorComponent: React.FC = () => {
  const [id, text, fontSize, fontFamily, fill] = (useAppStore as any)(
    useShallow((state: any) => {
      const obj = state.currentProject?.objects.find(
        (o: any) => o.id === state.selectedObject
      );
      if (!obj || obj.type !== 'text')
        return [
          '',
          '',
          PROPERTY_RANGES.fontSize.default,
          'Arial',
          '#000000',
        ] as const;
      return [
        obj.id,
        obj.properties?.text || '',
        obj.properties?.fontSize ?? PROPERTY_RANGES.fontSize.default,
        obj.properties?.fontFamily || 'Arial',
        obj.properties?.fill || '#000000',
      ] as const;
    })
  ) as [string, string, number, string, string];

  const [textLocal, setTextLocal] = React.useState(text);
  React.useEffect(() => setTextLocal(text), [text]);

  // Determine if this is an icon
  const isIcon = isIconText(textLocal || text);

  const commitText = React.useCallback(() => {
    if (id) patchSceneObject(id, { properties: { text: textLocal } });
  }, [id, textLocal]);

  const handleTextChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTextLocal(e.target.value);
    },
    []
  );

  const patchFontSize = useThrottledCallback(
    (val: number) => {
      if (id) patchSceneObject(id, { properties: { fontSize: val } });
    },
    80,
    [id]
  );

  const handleSize = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = clampNumber(
        Number(e.target.value),
        PROPERTY_RANGES.fontSize.min,
        PROPERTY_RANGES.fontSize.max ?? Infinity
      );
      patchFontSize(val);
    },
    [patchFontSize]
  );

  const handleFont = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (id) patchSceneObject(id, { properties: { fontFamily: val } });
    },
    [id]
  );

  const handleFillColor = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (id) patchSceneObject(id, { properties: { fill: val } });
    },
    [id]
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          {isIcon ? 'Icon' : 'Content'}
        </label>
        <textarea
          value={textLocal}
          onChange={handleTextChange}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitText();
            }
          }}
          className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          placeholder={isIcon ? 'Enter icon or emoji' : 'Enter text content'}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          {isIcon ? 'Size' : 'Font Size'}
        </label>
        <input
          type="range"
          min={PROPERTY_RANGES.fontSize.min}
          max={PROPERTY_RANGES.fontSize.max}
          step={PROPERTY_RANGES.fontSize.step}
          value={fontSize}
          onChange={handleSize}
          className="w-full"
        />
        <div className="text-xs text-gray-500 mt-1">{fontSize}px</div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Fill Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={fill}
            onChange={handleFillColor}
            className="w-8 h-8 rounded border border-gray-600 cursor-pointer"
          />
          <input
            type="text"
            value={fill}
            onChange={handleFillColor}
            className="flex-1 p-2 bg-gray-700 text-white rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="#000000"
          />
        </div>
      </div>
      {!isIcon && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Font</label>
          <select
            value={fontFamily}
            onChange={handleFont}
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export const TextEditor = React.memo(TextEditorComponent);
