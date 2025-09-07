import React from 'react';
import { useAppStore } from '../../store/appStore';
import { normalizeObject } from './normalization';
import { dispatchPanelUpdate } from './domain/updateBus';
import { PositionEditor } from './editors/PositionEditor'; // TODO: narrow selectors per editor
import { TextEditor } from './editors/TextEditor'; // TODO: narrow selectors per editor
import { ShapeEditor } from './editors/ShapeEditor'; // TODO: narrow selectors per editor
import { ImageEditor } from './editors/ImageEditor'; // TODO: narrow selectors per editor
import { SvgPathEditor } from './editors/SvgPathEditor'; // TODO: narrow selectors per editor
import { AnimationEditor } from './editors/AnimationEditor'; // TODO: narrow selectors per editor
import { LayerOrderEditor } from './editors/LayerOrderEditor'; // TODO: narrow selectors per editor

const PropertiesPanel: React.FC = () => {
  const { currentProject, selectedObject, updateObject, moveObjectLayer } = useAppStore();
  const obj = currentProject?.objects.find(o => o.id === selectedObject);

  React.useEffect(() => {
    if (!obj) return;
    const norm = normalizeObject(obj);
    if (norm) {
      updateObject(obj.id, norm, { silent: true });
    }
  }, [obj?.id, obj?.type, obj?.animationType, obj?.animationEasing, updateObject]);

  const update = React.useCallback(
    (patch: Partial<typeof obj>) => {
      if (!obj) return;
      // TODO: wire rAF-batched updates + one-gesture-one-undo
      dispatchPanelUpdate(() => updateObject(obj.id, patch as any));
    },
    [obj?.id, updateObject]
  );

  const move = React.useCallback(
    (id: string, dir: 'front' | 'back' | 'forward' | 'backward') => moveObjectLayer(id, dir),
    [moveObjectLayer]
  );

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
      <PositionEditor value={obj} onChange={update} />
      {obj.type === 'text' && <TextEditor value={obj} onChange={update} />}
      {obj.type === 'shape' && <ShapeEditor value={obj} onChange={update} />}
      {obj.type === 'image' && <ImageEditor value={obj} onChange={update} />}
      {obj.type === 'svgPath' && <SvgPathEditor value={obj} onChange={update} />}
      <AnimationEditor value={obj} onChange={update} />
      <LayerOrderEditor value={obj} onChange={update} move={move} />
    </div>
  );
};

export default React.memo(PropertiesPanel);
