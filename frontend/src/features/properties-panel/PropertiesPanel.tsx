import React from 'react';
import { useAppStore } from '../../store/appStore';
import { normalizeObject } from './normalization';
import { PositionEditor } from './editors/PositionEditor';
import { TextEditor } from './editors/TextEditor';
import { ShapeEditor } from './editors/ShapeEditor';
import { ImageEditor } from './editors/ImageEditor';
import { SvgPathEditor } from './editors/SvgPathEditor';
import { AnimationEditor } from './editors/AnimationEditor';
import { LayerOrderEditor } from './editors/LayerOrderEditor';

const PropertiesPanel: React.FC = () => {
  const { currentProject, selectedObject, updateObject } = useAppStore();
  const obj = currentProject?.objects.find((o) => o.id === selectedObject);

  React.useEffect(() => {
    if (!obj) return;
    const norm = normalizeObject(obj);
    if (norm) {
      updateObject(obj.id, norm, { silent: true });
    }
  }, [obj?.id, obj?.type, obj?.animationType, obj?.animationEasing, updateObject]);

  if (!obj) {
    return (
      <div className="h-full p-4">
        <h3 className="text-lg font-semibold text-gray-300 mb-4">Properties</h3>
        <p className="text-gray-500 text-sm">Select an object to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="h-full p-4 bg-gray-800 text-white overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-300 mb-4">Properties</h3>
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Object Info</h4>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <input
              type="text"
              value={obj.type}
              readOnly
              className="w-full p-2 bg-gray-700 text-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">ID</label>
            <input
              type="text"
              value={obj.id}
              readOnly
              className="w-full p-2 bg-gray-700 text-gray-300 rounded text-sm text-xs"
            />
          </div>
        </div>
      </div>
      <PositionEditor />
      {obj.type === 'text' && <TextEditor />}
      {obj.type === 'shape' && <ShapeEditor />}
      {obj.type === 'image' && <ImageEditor />}
      {obj.type === 'svgPath' && <SvgPathEditor />}
      <AnimationEditor />
      <LayerOrderEditor />
    </div>
  );
};

export default React.memo(PropertiesPanel);
