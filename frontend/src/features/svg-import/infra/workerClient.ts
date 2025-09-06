import type { ImportOptions, ImportedSvg } from '../domain/types';

export function runImportInWorker(
  svgText: string,
  options: Partial<ImportOptions>,
  onProgress: (p: any) => void,
  signal?: AbortSignal
): Promise<ImportedSvg> {
  const worker = new Worker(new URL('./svgWorker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    const cleanup = () => worker.terminate();
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'progress') onProgress(m);
      else if (m.type === 'done') { cleanup(); resolve(m.result); }
      else if (m.type === 'error') { cleanup(); reject(new Error(m.message)); }
    };
    if (signal) {
      signal.addEventListener('abort', () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }
    worker.postMessage({ svgText, options });
  });
}
