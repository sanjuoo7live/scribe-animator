// Backward-compatible re-exports for the SvgImporter entry point.
// - Default export: new SvgImportPanel UI
// - Named helpers: preview cap, batched creator, and tiny-path filter

export { default } from '../../features/svg-import/ui/SvgImportPanel';
export { createCanvasObjectBatched } from '../../features/svg-import/infra/addToCanvasAdapter';

// Keep the preview DPR cap available to existing consumers
export const preview = { dprCap: 1.5 } as const;

// Minimal dropTinyPaths helper retained for tests and parity
export function dropTinyPaths<T extends { len?: number }>(paths: T[], minLenPx: number) {
  const kept: T[] = [];
  let tinyCount = 0;
  for (const p of paths) {
    const L = typeof p.len === 'number' ? p.len : null;
    if (L != null && L < minLenPx) {
      tinyCount++;
      continue;
    }
    kept.push(p);
  }
  return { kept, tinyDropped: tinyCount, total: paths.length };
}
