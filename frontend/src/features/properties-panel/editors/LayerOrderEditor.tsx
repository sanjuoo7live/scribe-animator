import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../../store/appStore';
import { dispatchPanelUpdate } from '../domain/updateBus';

const LayerOrderEditorComponent: React.FC = () => {
  const [id] = (useAppStore as any)(
    useShallow((state: any) => {
      const obj = state.currentProject?.objects.find(
        (o: any) => o.id === state.selectedObject
      );
      return [obj?.id || ''] as const;
    })
  ) as [string];
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
    <div className="flex gap-2">
      <button className="px-2 py-1 bg-gray-700 rounded" onClick={makeHandler('front')}>Front</button>
      <button className="px-2 py-1 bg-gray-700 rounded" onClick={makeHandler('forward')}>Forward</button>
      <button className="px-2 py-1 bg-gray-700 rounded" onClick={makeHandler('backward')}>Backward</button>
      <button className="px-2 py-1 bg-gray-700 rounded" onClick={makeHandler('back')}>Back</button>
    </div>
  );
};

export const LayerOrderEditor = React.memo(LayerOrderEditorComponent);
