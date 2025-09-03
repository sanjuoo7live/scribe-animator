import { measureSvgLengthsInWorker } from './measureWorkerClient';
import type { MeasureItem } from './measureTypes';

export async function runMeasureWorkerAccuracyHarness() {
  if (process.env.NODE_ENV === 'production') return;
  const samples: string[] = [
    'M0 0 L100 0',
    'M0 0 L0 100',
    'M0 0 H100 V100 H0 Z',
    'M0 0 C50 100 50 -100 100 0',
    'M0 0 Q50 100 100 0',
    'M0 0 C0 50 100 50 100 0',
    'M0 0 Q0 100 100 100',
    'M0 0 C100 0 100 100 0 100 Z',
    'M0 0 C25 25 75 75 100 100',
    'M0 0 C100 50 50 100 100 0',
    'M0 0 Q50 -100 100 0',
    'M10 10 H90 V90 H10 Z',
    'M0 0 A50 50 0 0 1 100 100',
    'M0 0 A25 75 0 1 0 100 0',
    'M0 0 C0 100 100 0 100 100',
    'M0 0 Q100 0 100 100',
    'M0 0 C50 0 50 100 100 100',
    'M0 0 T100 0',
    'M0 0 S100 100 200 0',
    'M0 0 A40 20 45 0 1 100 50'
  ];
  const items: MeasureItem[] = samples.map(d => ({ d }));
  const { lens } = await measureSvgLengthsInWorker(items, 10);
  const svgNS = 'http://www.w3.org/2000/svg';
  const path = document.createElementNS(svgNS, 'path');
  const domLens = samples.map(d => {
    path.setAttribute('d', d);
    return path.getTotalLength();
  });
  const maxErr = Math.max(
    ...lens.map((l, i) => {
      const trueLen = domLens[i] || 1;
      return Math.abs(l - trueLen) / trueLen;
    })
  );
  if (maxErr > 0.02) {
    throw new Error(`worker length error ${(maxErr * 100).toFixed(2)}% exceeds threshold`);
  } else {
    console.log('Measure worker harness max error', maxErr);
  }
}

if (process.env.NODE_ENV !== 'production') {
  // Run automatically in development builds
  runMeasureWorkerAccuracyHarness().catch(e => console.error(e));
}
