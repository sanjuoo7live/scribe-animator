import { createCanvasObjectBatched, dropTinyPaths } from '../core/SvgImporter';

// Polyfill rAF for node environment
beforeAll(() => {
  (global as any).requestAnimationFrame = (cb: any) => setTimeout(() => cb(0), 0);
});

test('batched creation yields multiple rAF breaks', async () => {
  const paths = Array.from({ length: 120 }, (_, i) => ({ d: `M0 0 L${i} 0`, len: i }));
  let calls = 0;
  await createCanvasObjectBatched(paths as any, { batchSize: 50, onProgress: () => { calls++; } });
  expect(calls).toBeGreaterThan(1);
});

test('tiny paths filtered when below threshold', () => {
  const paths = [
    { d: 'M0 0 L0 0', len: 0.5 },
    { d: 'M0 0 L10 0', len: 10 }
  ] as any;
  const res = dropTinyPaths(paths, 1.0);
  expect(res.kept.length).toBe(1);
  expect(res.tinyDropped).toBe(1);
});
