import { SceneObject, useAppStore } from '../../../store/appStore';
import { dispatchPanelUpdate } from './updateBus';

export const patchSceneObject = <K extends keyof SceneObject>(
  id: string,
  patch: Pick<SceneObject, K>
) => {
  dispatchPanelUpdate(() => {
    const state = useAppStore.getState();
    const obj = state.currentProject?.objects.find((o) => o.id === id);
    if (!obj) return;
    let next: Partial<SceneObject> = patch;
    if ('properties' in patch) {
      next = {
        ...patch,
        properties: { ...(obj.properties || {}), ...(patch as any).properties },
      } as any;
    }
    state.updateObject(id, next);
  });
};

