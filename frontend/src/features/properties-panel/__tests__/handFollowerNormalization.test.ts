import { normalizeHandFollower, normalizeObject } from '../normalization';
import PROPERTY_RANGES from '../domain/constants';

describe('normalizeHandFollower', () => {
  it('merges defaults and clamps values', () => {
    const obj: any = {
      type: 'svgPath',
      properties: {
        handFollower: {
          enabled: true,
          scale: 10,
          smoothing: { enabled: true, strength: 1 },
        },
      },
    };
    const result = normalizeHandFollower(obj as any);
    expect(result).toEqual({
      properties: {
        handFollower: {
          enabled: true,
          mirror: false,
          scale: PROPERTY_RANGES.handScale.max,
          smoothing: {
            enabled: true,
            strength: PROPERTY_RANGES.smoothingStrength.max,
          },
          cornerLifts: { enabled: false },
        },
      },
    });
  });

  it('returns null when no handFollower', () => {
    const obj: any = { type: 'svgPath', properties: {} };
    expect(normalizeHandFollower(obj as any)).toBeNull();
  });

  it('orchestrator applies hand follower normalization idempotently', () => {
    const obj: any = {
      id: '1',
      type: 'svgPath',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      properties: { handFollower: { scale: 10 } },
    };
    const diff = normalizeObject(obj);
    expect(diff?.properties?.handFollower?.scale).toBe(
      PROPERTY_RANGES.handScale.max
    );
    const merged = {
      ...obj,
      ...diff,
      properties: {
        ...obj.properties,
        ...(diff?.properties || {}),
      },
    };
    expect(normalizeObject(merged)).toBeNull();
  });
});
