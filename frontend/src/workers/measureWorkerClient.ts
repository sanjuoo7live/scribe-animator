import {
  MeasureItem,
  MeasureResult,
  WorkerMessage,
  WorkerRequest,
} from './measureTypes';

type Pending = {
  resolve: (r: MeasureResult) => void;
  reject: (e: any) => void;
  onProgress?: (p: number) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
};

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./measureWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent<WorkerMessage>) => {
      const data = ev.data;
      const entry = pending.get(data.id);
      if (!entry) return;
      if (data.type === 'progress') {
        entry.onProgress?.(data.done / data.total);
        return;
      }
      if (data.type === 'result') {
        entry.resolve({ lens: data.lens, total: data.total, errors: data.errors });
      } else if (data.type === 'abort') {
        entry.reject(new DOMException('Aborted', 'AbortError'));
      }
      if (entry.signal && entry.onAbort) {
        entry.signal.removeEventListener('abort', entry.onAbort);
        entry.onAbort = undefined;
      }
      pending.delete(data.id);
    };
    worker.onerror = err => {
      pending.forEach(p => {
        if (p.signal && p.onAbort) {
          p.signal.removeEventListener('abort', p.onAbort);
          p.onAbort = undefined;
        }
        p.reject(err);
      });
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

export function measureSvgLengthsInWorker(
  items: MeasureItem[],
  _budgetMs = 12, // retained for API parity; worker ignores budget
  signal?: AbortSignal,
  onProgress?: (p: number) => void
): Promise<MeasureResult> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const id = seq++;
    const entry: Pending = { resolve, reject, onProgress, signal };
    const onAbort = () => {
      pending.delete(id);
      const msg: WorkerRequest = { id, type: 'abort' };
      w.postMessage(msg);
      if (signal) signal.removeEventListener('abort', onAbort);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    entry.onAbort = onAbort;
    if (signal) signal.addEventListener('abort', onAbort);
    pending.set(id, entry);
    const msg: WorkerRequest = { id, type: 'measure', items };
    w.postMessage(msg);
  });
}
