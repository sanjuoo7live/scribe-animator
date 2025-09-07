import { normalizeObject } from '../normalization';
import type { SceneObject } from '../../../store/appStore';

describe('svgPath animation defaults', () => {
  it('enforces drawIn + linear', () => {
    const obj: SceneObject = {
      id: '1',
      type: 'svgPath',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      properties: { handFollower: { enabled: false } },
      animationType: 'scaleIn',
      animationEasing: 'easeInOut',
    } as any;
    const diff = normalizeObject(obj);
    expect(diff?.animationType).toBe('drawIn');
    expect(diff?.animationEasing).toBe('linear');
    const merged = { ...obj, ...diff } as any;
    expect(normalizeObject(merged)).toBeNull();
  });
});
