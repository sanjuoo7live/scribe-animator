import React from 'react';
import { shallow } from 'zustand/shallow';
import { useAppStore } from '../../../store/appStore';
import PROPERTY_RANGES from '../domain/constants';
import { clampNumber } from '../validation';
import { patchSceneObject } from '../domain/patch';

const fonts = ['Arial', 'Helvetica', 'Times New Roman'];

const TextEditorComponent: React.FC = () => {
  const { id, text, fontSize, fontFamily } = (useAppStore as any)(
    (state: any) => {
      const obj = state.currentProject?.objects.find(
        (o: any) => o.id === state.selectedObject
      );
      if (!obj || obj.type !== 'text')
        return {
          id: '',
          text: '',
          fontSize: PROPERTY_RANGES.fontSize.default,
          fontFamily: 'Arial',
        };
      return {
        id: obj.id,
        text: obj.properties?.text || '',
        fontSize: obj.properties?.fontSize ?? PROPERTY_RANGES.fontSize.default,
        fontFamily: obj.properties?.fontFamily || 'Arial',
      };
    },
    shallow
  ) as { id: string; text: string; fontSize: number; fontFamily: string };

  const [textLocal, setTextLocal] = React.useState(text);
  React.useEffect(() => setTextLocal(text), [text]);

  const commitText = React.useCallback(() => {
    if (id) patchSceneObject(id, { properties: { text: textLocal } });
  }, [id, textLocal]);

  const handleTextChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTextLocal(e.target.value);
    },
    []
  );

  const handleSize = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = clampNumber(
        Number(e.target.value),
        PROPERTY_RANGES.fontSize.min,
        PROPERTY_RANGES.fontSize.max ?? Infinity
      );
      if (id) patchSceneObject(id, { properties: { fontSize: val } });
    },
    [id]
  );

  const handleFont = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (id) patchSceneObject(id, { properties: { fontFamily: val } });
    },
    [id]
  );

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-400 mb-2">Text</h4>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Content</label>
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
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Font Size</label>
          <input
            type="range"
            min={PROPERTY_RANGES.fontSize.min}
            max={PROPERTY_RANGES.fontSize.max}
            step={PROPERTY_RANGES.fontSize.step}
            value={fontSize}
            onChange={handleSize}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Font</label>
          <select
            value={fontFamily}
            onChange={handleFont}
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          >
            {fonts.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export const TextEditor = React.memo(TextEditorComponent);
