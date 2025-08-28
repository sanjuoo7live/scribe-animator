// Web Worker: vector trace off main thread
// Note: This worker is a module and imports the simple tracer
import { traceImageDataToMetaPaths } from './simpleTrace';

type TraceRequest = {
  imageData: ImageData;
  threshold: number;
  simplifyEps: number;
  mode?: 'single' | 'tiled';
  tileSize?: number; // used when mode === 'tiled'
};
type TraceResponse = { paths: string[] };

// eslint-disable-next-line no-restricted-globals
(globalThis as any).addEventListener('message', (ev: MessageEvent<TraceRequest>) => {
  try {
    const { imageData, threshold, simplifyEps } = ev.data;
    const { width, height } = imageData;
    
    const MIN_AREA = 2; // px^2 (more detail)
    const MIN_LENGTH = 6; // px (more detail)
    const MAX_PATHS = 500; // Higher cap for better quality

    const mode = ev.data.mode || 'single';
    const tileSize = Math.max(64, Math.min(ev.data.tileSize || 512, 1024));

    const collect = (ims: ImageData, offsetX = 0, offsetY = 0) => {
      // VTracer-inspired quality settings
      const isUltraComplex = ims.width * ims.height > 200000; // >200k pixels
      const caps = isUltraComplex ? {
        maxContours: 800,        // Higher quality
        pointBudget: 150_000,    // More points for detail
        perContourMaxPoints: 2000, // More detail per path
        timeBudgetMs: 3000,      // More time for quality
      } : {
        maxContours: 2000,       // Much higher for better detail
        pointBudget: 400_000,    // More generous
        perContourMaxPoints: 5000, // More detail
        timeBudgetMs: 5000,      // More time
      };
      
      const meta = traceImageDataToMetaPaths(ims, threshold, simplifyEps, caps);
      const filtered = meta.filter(p => p.area >= MIN_AREA && p.length >= MIN_LENGTH);
      
      return filtered.map(p =>
        // Offset absolute M/L coordinates by tile origin
        p.d.replace(/([ML])\s+([\d.-]+)\s+([\d.-]+)/g, (_m, cmd, x, y) => {
          const nx = Number(x) + offsetX;
          const ny = Number(y) + offsetY;
          return `${cmd} ${nx} ${ny}`;
        })
      );
    };

  let paths: string[] = [];
  if (mode === 'tiled' && (imageData.width > tileSize || imageData.height > tileSize)) {
    const { width, height, data } = imageData;
    const chans = 4;
    for (let ty = 0; ty < height; ty += tileSize) {
      const th = Math.min(tileSize, height - ty);
      for (let tx = 0; tx < width; tx += tileSize) {
        const tw = Math.min(tileSize, width - tx);
        const tileArr = new Uint8ClampedArray(tw * th * chans);
        // Copy pixels into the tile buffer
        for (let y = 0; y < th; y++) {
          const srcRow = ((ty + y) * width + tx) * chans;
          const dstRow = y * tw * chans;
          tileArr.set(data.slice(srcRow, srcRow + tw * chans), dstRow);
        }
        const tile = new ImageData(tileArr, tw, th);
        paths.push(...collect(tile, tx, ty));
        if (paths.length > MAX_PATHS) break;
      }
      if (paths.length > MAX_PATHS) break;
    }
  } else {
    paths = collect(imageData, 0, 0);
  }

  // Global cap (higher for VTracer-like quality)
  paths = paths.slice(0, MAX_PATHS);
  
  // @ts-ignore
  (globalThis as any).postMessage({ paths } as TraceResponse);
  } catch (e) {
  // @ts-ignore
  (globalThis as any).postMessage({ paths: [], error: (e as any)?.message || String(e) });
  }
});
