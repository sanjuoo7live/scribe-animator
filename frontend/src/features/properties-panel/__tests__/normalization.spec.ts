import { normalizeObject } from '../normalization';
import PROPERTY_RANGES from '../domain/constants';
import type { SceneObject } from '../../../store/appStore';

function apply(obj: SceneObject, patch: Partial<SceneObject>): SceneObject {
  const next = { ...obj, ...patch } as any;
  if (patch.properties) {
    next.properties = { ...obj.properties, ...patch.properties };
  }
  return next;
}

test('normalizeObject clamps values and is idempotent', () => {
  const obj: SceneObject = {
    id: '1',
    type: 'shape',
    x: 0,
    y: 0,
    width: -5,
    height: 0,
    properties: { strokeWidth: 99 },
    animationStart: -1,
    animationDuration: 0,
  };
  const diff = normalizeObject(obj);
  expect(diff).not.toBeNull();
  const normalized = apply(obj, diff!);
  expect(normalized.width).toBe(PROPERTY_RANGES.width.min);
  expect(normalized.height).toBe(PROPERTY_RANGES.height.min);
  expect(normalized.properties.strokeWidth).toBe(PROPERTY_RANGES.strokeWidth.max);
  expect(normalized.animationStart).toBe(PROPERTY_RANGES.animationStart.min);
  expect(normalized.animationDuration).toBe(PROPERTY_RANGES.animationDuration.min);
  const diff2 = normalizeObject(normalized);
  expect(diff2).toBeNull();
});
