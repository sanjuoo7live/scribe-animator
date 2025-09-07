import type { SceneObject } from '../../store/appStore';

// Normalize object properties to maintain backward compatibility
export function normalizeObject(obj: SceneObject): Partial<SceneObject> | null {
  if (obj.type === 'svgPath') {
    const next: Partial<SceneObject> = {};
    if (obj.animationType !== 'drawIn') {
      next.animationType = 'drawIn';
    }
    if (obj.animationEasing !== 'linear') {
      next.animationEasing = 'linear';
    }
    return Object.keys(next).length ? next : null;
  }
  return null;
}
