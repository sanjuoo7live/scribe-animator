// src/utils/pathCache.ts
// NOTE: Fail-soft: if anything throws, return uncached fallback.

export type LutPoint = { s: number; x: number; y: number; theta: number };
export type HandLUT = { len: number; points: LutPoint[] };

const svgNS = 'http://www.w3.org/2000/svg';
let _scratchPath: SVGPathElement | null = null;

const path2DCache = new Map<string, Path2D>();
const MAX_PATH2D_CACHE = 2000;
const lengthCache = new Map<string, number>();
const lutCache = new Map<string, HandLUT>();

function getScratchPath(): SVGPathElement {
  if (!_scratchPath) {
    _scratchPath = document.createElementNS(svgNS, 'path');
  }
  return _scratchPath;
}

/** Cached Path2D; falls back to new Path2D(d) on error */
export function getPath2D(d: string): Path2D {
  try {
    let p = path2DCache.get(d);
    if (p) {
      path2DCache.delete(d);
      path2DCache.set(d, p);
    } else {
      p = new Path2D(d);
      path2DCache.set(d, p);
      if (path2DCache.size > MAX_PATH2D_CACHE) {
        const k = path2DCache.keys().next().value;
        if (k) path2DCache.delete(k);
      }
    }
    return p;
  } catch {
    // fail-soft
    return new Path2D(d);
  }
}

/** Cached total length; falls back to on-the-fly measurement */
export function getPathTotalLength(d: string): number {
  try {
    let len = lengthCache.get(d);
    if (len == null) {
      const path = getScratchPath();
      path.setAttribute('d', d);
      len = path.getTotalLength();
      lengthCache.set(d, len);
    }
    return len;
  } catch {
    // conservative fallback: compute once
    try {
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', d);
      return path.getTotalLength();
    } catch {
      // last resort
      return 0;
    }
  }
}

/** Build (or get) an arc-length LUT for O(1) hand pose sampling */
export function getHandLUT(d: string, samplePx = 2): HandLUT {
  try {
    const key = samplePx === 2 ? d : `${d}#${samplePx}`;
    let lut = lutCache.get(key);
    if (lut) return lut;

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', d);
    const total = path.getTotalLength();
    const n = Math.max(2, Math.ceil(total / samplePx));

    const points: LutPoint[] = [];
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * total;
      const pt = path.getPointAtLength(s);
      const theta = tangentAngle(path, s, total);
      points.push({ s, x: pt.x, y: pt.y, theta });
    }
    lut = { len: total, points };
    lutCache.set(key, lut);
    return lut;
  } catch {
    // fail-soft: minimal LUT to avoid crashes; caller may ignore pose smoothing
    return { len: 0, points: [{ s: 0, x: 0, y: 0, theta: 0 }] };
  }
}

/** Build LUT with coordinates and tangents computed in transformed space */
export function getHandLUTTransformed(d: string, matrix?: number[], samplePx = 2): HandLUT {
  try {
    if (!matrix || matrix.length < 6) return getHandLUT(d, samplePx);
    const key = `${d}#m:${matrix.join(',')}#${samplePx}`;
    let lut = lutCache.get(key);
    if (lut) return lut;

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', d);
    const total = path.getTotalLength();
    const n = Math.max(2, Math.ceil(total / samplePx));
    const [a, b, c, d2, e, f] = matrix;

    const points: LutPoint[] = [];
    const eps = 0.5;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * total;
      const p = path.getPointAtLength(s);
      const px = a * p.x + c * p.y + e;
      const py = b * p.x + d2 * p.y + f;
      const p0 = path.getPointAtLength(Math.max(0, s - eps));
      const p1 = path.getPointAtLength(Math.min(total, s + eps));
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const tdx = a * dx + c * dy;
      const tdy = b * dx + d2 * dy;
      const theta = Math.atan2(tdy, tdx);
      points.push({ s, x: px, y: py, theta });
    }
    lut = { len: total, points };
    lutCache.set(key, lut);
    return lut;
  } catch {
    return { len: 0, points: [{ s: 0, x: 0, y: 0, theta: 0 }] };
  }
}

/**
 * Asynchronously build a transformed Hand LUT in idle slices to avoid jank.
 * Resolves immediately from cache when available.
 */
export function buildHandLUTTransformedAsync(
  d: string,
  matrix?: number[],
  samplePx = 2
): Promise<HandLUT> {
  try {
    if (!matrix || matrix.length < 6) return Promise.resolve(getHandLUT(d, samplePx));
    const key = `${d}#m:${matrix.join(',')}#${samplePx}`;
    const cached = lutCache.get(key);
    if (cached) return Promise.resolve(cached);

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', d);
    const total = path.getTotalLength();
    const n = Math.max(2, Math.ceil(total / samplePx));
    const [a, b, c, d2, e, f] = matrix;
    const points: LutPoint[] = new Array(n + 1);
    const eps = 0.5;
    let i = 0;

    return new Promise<HandLUT>((resolve) => {
      const step = (deadline?: { timeRemaining: () => number }) => {
        const budgetMs = 8;
        const t0 = performance.now();
        while (i <= n && ((deadline && deadline.timeRemaining() > 1) || (performance.now() - t0) < budgetMs)) {
          const s = (i / n) * total;
          const p = path.getPointAtLength(s);
          const px = a * p.x + c * p.y + e;
          const py = b * p.x + d2 * p.y + f;
          const p0 = path.getPointAtLength(Math.max(0, s - eps));
          const p1 = path.getPointAtLength(Math.min(total, s + eps));
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const tdx = a * dx + c * dy;
          const tdy = b * dx + d2 * dy;
          const theta = Math.atan2(tdy, tdx);
          points[i] = { s, x: px, y: py, theta };
          i++;
        }
        if (i <= n) {
          const ric = (globalThis as any).requestIdleCallback as ((cb: (d: any) => void) => number) | undefined;
          if (ric) ric(step);
          else setTimeout(() => step(), 0);
        } else {
          const lut: HandLUT = { len: total, points };
          lutCache.set(key, lut);
          resolve(lut);
        }
      };
      const ric = (globalThis as any).requestIdleCallback as ((cb: (d: any) => void) => number) | undefined;
      if (ric) ric(step); else setTimeout(() => step(), 0);
    }).finally(() => {
      // cleanup path element (not attached to DOM but be safe)
      // no-op; not appended
    });
  } catch {
    return Promise.resolve({ len: 0, points: [{ s: 0, x: 0, y: 0, theta: 0 }] });
  }
}

/**
 * Build a hand lookup table directly from existing path samples.
 * Falls back to null if samples are missing or invalid.
 */
export function samplesToLut(samples?: {x:number; y:number; cumulativeLength:number}[]): HandLUT | null {
  if (!samples || samples.length < 2) return null;
  try {
    const pts: LutPoint[] = new Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const a = samples[Math.max(0, i - 1)];
      const b = samples[Math.min(samples.length - 1, i + 1)];
      const theta = Math.atan2(b.y - a.y, b.x - a.x);
      const s = samples[i].cumulativeLength;
      pts[i] = { s, x: samples[i].x, y: samples[i].y, theta };
    }
    return { len: samples[samples.length - 1].cumulativeLength, points: pts };
  } catch {
    return null;
  }
}

function tangentAngle(path: SVGPathElement, s: number, total: number): number {
  const eps = 0.5;
  const a = Math.max(0, s - eps);
  const b = Math.min(total, s + eps);
  const p0 = path.getPointAtLength(a);
  const p1 = path.getPointAtLength(b);
  return Math.atan2(p1.y - p0.y, p1.x - p0.x);
}

/** Optional: expose small utilities to clear caches for tests/hot reload */
export function _clearPathCaches() {
  path2DCache.clear();
  lengthCache.clear();
  lutCache.clear();
}
