import type { ExtractedSvg } from '../extractPaths';

test('normalizes colors and computes stable hash', async () => {
  (global as any).OffscreenCanvas = class {
    constructor() {}
    getContext() {
      return {
        set fillStyle(v: string) { this._v = v; },
        get fillStyle() { return '#ff0000'; }
      } as any;
    }
  } as any;
  const { normalize } = await import('../normalize');
  const doc = new DOMParser().parseFromString('<svg/>', 'image/svg+xml');
  const vetted: ExtractedSvg = {
    doc,
    width: 10,
    height: 10,
    viewBox: [0,0,10,10],
    paths: [{ d: 'M0 0 L1 1', fill: 'red', stroke: '#000', strokeWidth: 1, opacity: 1 }],
    warnings: []
  };
  const res1 = normalize(vetted, {} as any);
  const res2 = normalize(vetted, {} as any);
  expect(res1.paths[0].fill).toBe('#ff0000');
  expect(res1.paths[0].hash).toBe(res2.paths[0].hash);
});
