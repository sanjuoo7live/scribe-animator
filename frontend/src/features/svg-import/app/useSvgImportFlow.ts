import { useCallback, useRef, useState } from 'react';
import type { ImportOptions, ImportedSvg } from '../domain/types';
import { runImportInWorker } from '../infra/workerClient';
import type { ImportProgress } from './progress';

export function useSvgImportFlow() {
  const [progress, setProgress] = useState<ImportProgress>({ stage: 'sanitize' });
  const [result, setResult] = useState<ImportedSvg | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (svgText: string, options: Partial<ImportOptions> = {}) => {
    setResult(null);
    setError(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const defaults: ImportOptions = {
      flattenTransforms: true,
      unitPx: 1,
      maxElements: 100000,
      maxCommandsPerPath: 100000,
      skipTinySegmentsPx: 0.25,
    };

    try {
      const res = await runImportInWorker(svgText, { ...defaults, ...options }, setProgress, abortRef.current.signal);
      setResult(res);
      setProgress({ stage: 'done' });
      return res;
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? 'Import cancelled' : e?.message || String(e);
      setError(msg);
      setProgress({ stage: 'error', message: msg });
      throw e;
    }
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { start, cancel, progress, result, error };
}
