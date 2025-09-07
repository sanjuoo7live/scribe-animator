import React from 'react';
import { shallow } from 'zustand/shallow';
import { useAppStore } from '../../../store/appStore';
import { dispatchPanelUpdate } from '../domain/updateBus';

const LayerOrderEditorComponent: React.FC = () => {
  const { id } = (useAppStore as any)(
    (state: any) => {
      const obj = state.currentProject?.objects.find(
        (o: any) => o.id === state.selectedObject
      );
      return { id: obj?.id || '' };
    },
    shallow
  ) as { id: string };
  const move = useAppStore((s) => s.moveObjectLayer);

  const makeHandler = React.useCallback(
    (dir: 'front' | 'back' | 'forward' | 'backward') => () => {
      if (!id) return;
      dispatchPanelUpdate(() => move(id, dir));
    },
    [id, move]
  );

  if (!id) return null;

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-400 mb-2">Layer Order</h4>
      <div className="flex gap-2">
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={makeHandler('front')}>Front</button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={makeHandler('forward')}>Forward</button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={makeHandler('backward')}>Backward</button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={makeHandler('back')}>Back</button>
      </div>
    </div>
  );
};

export const LayerOrderEditor = React.memo(LayerOrderEditorComponent);
