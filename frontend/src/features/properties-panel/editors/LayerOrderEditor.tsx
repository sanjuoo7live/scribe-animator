import React from 'react';
import type { SceneObject } from '../../../store/appStore';

interface Props {
  value: SceneObject;
  onChange: (patch: Partial<SceneObject>) => void;
  move: (id: string, direction: 'front' | 'back' | 'forward' | 'backward') => void;
}

const LayerOrderEditorComponent: React.FC<Props> = ({ value, onChange, move }) => {
  void onChange;
  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-400 mb-2">Layer Order</h4>
      <div className="flex gap-2">
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => move(value.id, 'front')}>Front</button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => move(value.id, 'forward')}>Forward</button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => move(value.id, 'backward')}>Backward</button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => move(value.id, 'back')}>Back</button>
      </div>
    </div>
  );
};

export const LayerOrderEditor = React.memo(LayerOrderEditorComponent);
