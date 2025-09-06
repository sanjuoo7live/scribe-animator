import type { ImportedSvg, ImportedPath } from '../domain/types';
import { pathLength } from '../domain/validate';

export async function createCanvasObjectBatched<T extends ImportedPath & { len?: number }>(
  paths: T[],
  opts: { batchSize: number; onProgress?: (done: number, total: number) => void }
): Promise<T[]> {
  const total = paths.length;
  const result: T[] = [];
  for (let i = 0; i < total; i += opts.batchSize) {
    const slice = paths.slice(i, i + opts.batchSize);
    result.push(...slice);
    opts.onProgress?.(Math.min(i + slice.length, total), total);
    // eslint-disable-next-line no-await-in-loop
    await new Promise(res => setTimeout(res, 0));
  }
  return result;
}

export async function addImportedSvgToCanvas(
  svg: ImportedSvg,
  opts: { batchSize?: number; onProgress?: (done: number, total: number) => void } = {}
) {
  const batchSize = opts.batchSize ?? 50;
  const start = performance.now();
  const withLen = svg.paths.map(p => ({ ...p, len: pathLength(p.d) }));
  let maxBatchMs = 0;
  let last = performance.now();
  const paths = await createCanvasObjectBatched(withLen, {
    batchSize,
    onProgress: (d, t) => {
      const now = performance.now();
      maxBatchMs = Math.max(maxBatchMs, now - last);
      last = now;
      opts.onProgress?.(d, t);
    },
  });
  const total = withLen.reduce((s, p) => s + (p.len || 0), 0);
  return { paths, total, durationMs: performance.now() - start, maxBatchMs };
}
