import type { SceneObject } from '../../store/appStore';
import PROPERTY_RANGES from './domain/constants';
import { clampNumber } from './validation';

/** Normalize basic numeric fields present on all objects. */
function normalizeBase(obj: SceneObject): Partial<SceneObject> | null {
  const next: Partial<SceneObject> = {};
    const nx = clampNumber(
      obj.x,
      PROPERTY_RANGES.x.min,
      PROPERTY_RANGES.x.max ?? Infinity
    );
  if (nx !== obj.x) next.x = nx;
    const ny = clampNumber(
      obj.y,
      PROPERTY_RANGES.y.min,
      PROPERTY_RANGES.y.max ?? Infinity
    );
  if (ny !== obj.y) next.y = ny;
  const width = clampNumber(
    obj.width ?? PROPERTY_RANGES.width.default,
    PROPERTY_RANGES.width.min,
    PROPERTY_RANGES.width.max ?? Infinity
  );
  if (width !== obj.width) next.width = width;
  const height = clampNumber(
    obj.height ?? PROPERTY_RANGES.height.default,
    PROPERTY_RANGES.height.min,
    PROPERTY_RANGES.height.max ?? Infinity
  );
  if (height !== obj.height) next.height = height;
  return Object.keys(next).length ? next : null;
}

/** Normalize animation timing for any object. */
export function normalizeAnimation(obj: SceneObject): Partial<SceneObject> | null {
  const next: Partial<SceneObject> = {};
  const start = clampNumber(
    obj.animationStart ?? PROPERTY_RANGES.animationStart.default,
    PROPERTY_RANGES.animationStart.min,
    PROPERTY_RANGES.animationStart.max ?? Infinity
  );
  if (start !== obj.animationStart) next.animationStart = start;
  const duration = clampNumber(
    obj.animationDuration ?? PROPERTY_RANGES.animationDuration.default,
    PROPERTY_RANGES.animationDuration.min,
    PROPERTY_RANGES.animationDuration.max ?? Infinity
  );
  if (duration !== obj.animationDuration) next.animationDuration = duration;
  return Object.keys(next).length ? next : null;
}

/** Ensure svgPath objects honor draw-in defaults. */
export function normalizeSvgPath(obj: SceneObject): Partial<SceneObject> | null {
  if (obj.type !== 'svgPath') return null;
  const next: Partial<SceneObject> = {};
  if (obj.animationType !== 'drawIn') next.animationType = 'drawIn';
  if (obj.animationEasing !== 'linear') next.animationEasing = 'linear';
  return Object.keys(next).length ? next : null;
}

/** Clamp shape specific properties like stroke width. */
export function normalizeShape(obj: SceneObject): Partial<SceneObject> | null {
  if (obj.type !== 'shape') return null;
  const next: Partial<SceneObject> = {};
  const stroke = clampNumber(
    obj.properties?.strokeWidth ?? PROPERTY_RANGES.strokeWidth.default,
    PROPERTY_RANGES.strokeWidth.min,
    PROPERTY_RANGES.strokeWidth.max ?? Infinity
  );
  if (stroke !== obj.properties?.strokeWidth) {
    next.properties = { ...obj.properties, strokeWidth: stroke } as any;
  }
  return Object.keys(next).length ? next : null;
}

export function normalizeText(_obj: SceneObject): Partial<SceneObject> | null {
  return null;
}

export function normalizeImage(_obj: SceneObject): Partial<SceneObject> | null {
  return null;
}

export function normalizeDrawPath(_obj: SceneObject): Partial<SceneObject> | null {
  return null;
}

export function normalizeHandFollower(obj: SceneObject): Partial<SceneObject> | null {
  if (obj.type !== 'svgPath') return null;
  const hf = (obj.properties as any)?.handFollower;
  if (!hf) return null;

  const defaults = {
    enabled: false,
    mirror: false,
    scale: PROPERTY_RANGES.handScale.default,
    smoothing: { enabled: false, strength: PROPERTY_RANGES.smoothingStrength.default },
    cornerLifts: { enabled: false },
  };
  const next = {
    ...defaults,
    ...hf,
    smoothing: {
      ...defaults.smoothing,
      ...(hf?.smoothing || {}),
      strength: clampNumber(
        hf?.smoothing?.strength ?? defaults.smoothing.strength,
        PROPERTY_RANGES.smoothingStrength.min,
        PROPERTY_RANGES.smoothingStrength.max ?? Infinity
      ),
    },
  };
  next.scale = clampNumber(
    next.scale,
    PROPERTY_RANGES.handScale.min,
    PROPERTY_RANGES.handScale.max ?? Infinity
  );
  if (JSON.stringify(next) === JSON.stringify(hf)) return null;
  return { properties: { handFollower: next } } as any;
}

function mergePatch(base: Partial<SceneObject>, patch: Partial<SceneObject>) {
  if (patch.properties) {
    base.properties = { ...(base.properties as any || {}), ...patch.properties } as any;
  }
  for (const key of Object.keys(patch)) {
    if (key === 'properties') continue;
    (base as any)[key] = (patch as any)[key];
  }
}

// Orchestrator that composes all normalizers.
export function normalizeObject(obj: SceneObject): Partial<SceneObject> | null {
  const result: Partial<SceneObject> = {};
  const merge = (p: Partial<SceneObject> | null) => p && mergePatch(result, p);
  merge(normalizeBase(obj));
  merge(normalizeAnimation(obj));
  switch (obj.type) {
    case 'shape':
      merge(normalizeShape(obj));
      break;
    case 'text':
      merge(normalizeText(obj));
      break;
    case 'image':
      merge(normalizeImage(obj));
      break;
    case 'drawPath':
      merge(normalizeDrawPath(obj));
      break;
    case 'svgPath':
      merge(normalizeSvgPath(obj));
      if (obj.properties?.handFollower) {
        merge(normalizeHandFollower(obj));
      }
      break;
    default:
      break;
  }
  return Object.keys(result).length ? result : null;
}
