// Simple in-browser raster -> vector trace utilities
// 1) Binarize image by threshold
// 2) Extract contours using Moore-Neighbor tracing
// 3) Simplify with Ramer–Douglas–Peucker

export type Point = { x: number; y: number };

export function binarize(imageData: ImageData, threshold: number): Uint8Array {
  const { data, width, height } = imageData;
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) * (a / 255);
      out[y * width + x] = lum < threshold ? 1 : 0; // 1 = foreground
    }
  }
  return out;
}

export function isBoundary(bin: Uint8Array, w: number, h: number, x: number, y: number): boolean {
  if (bin[y * w + x] === 0) return false;
  // 4-neighbors
  const n = (yy: number, xx: number) => (yy >= 0 && yy < h && xx >= 0 && xx < w) ? bin[yy * w + xx] : 0;
  return !(n(y - 1, x) && n(y + 1, x) && n(y, x - 1) && n(y, x + 1));
}

// Moore-Neighbor tracing for one contour; returns polyline around boundary
export function traceContour(bin: Uint8Array, w: number, h: number, sx: number, sy: number, visited: Uint8Array): Point[] {
  const contour: Point[] = [];
  let x = sx, y = sy;
  // Previous direction (dx,dy). Start by coming from left (so we search neighbors starting up-left)
  let pdx = 0, pdy = 1; // arbitrary init to orient search
  const maxIter = w * h * 10; // safety
  let iter = 0;

  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [1, 0], [1, 1], [0, 1],
    [-1, 1], [-1, 0]
  ];
  const idx = (yy: number, xx: number) => yy * w + xx;
  const inb = (yy: number, xx: number) => (yy >= 0 && yy < h && xx >= 0 && xx < w);

  do {
    contour.push({ x, y });
    visited[idx(y, x)] = 1;
    // Find next boundary neighbor, starting search relative to previous direction
    // Convert previous dir to a starting neighbor index
    // Map pdx,pdy to neighbor index approx
    let startK = 0;
    for (let k = 0; k < 8; k++) {
      if (neighbors[k][0] === pdx && neighbors[k][1] === pdy) { startK = (k + 6) % 8; break; }
    }
    let found = false;
    for (let t = 0; t < 8; t++) {
      const k = (startK + t) % 8;
      const nx = x + neighbors[k][0];
      const ny = y + neighbors[k][1];
      if (!inb(ny, nx)) continue;
      if (bin[idx(ny, nx)] === 1 && isBoundary(bin, w, h, nx, ny)) {
        pdx = neighbors[k][0];
        pdy = neighbors[k][1];
        x = nx; y = ny; found = true; break;
      }
    }
    if (!found) break;
    iter++;
  } while ((x !== sx || y !== sy) && iter < maxIter);

  return contour;
}

export function rdp(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points.slice();
  const dmaxInfo = maxPerpendicularDistance(points);
  if (dmaxInfo.dmax > epsilon) {
    const rec1 = rdp(points.slice(0, dmaxInfo.index + 1), epsilon);
    const rec2 = rdp(points.slice(dmaxInfo.index), epsilon);
    return rec1.slice(0, -1).concat(rec2);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

function maxPerpendicularDistance(points: Point[]): { dmax: number; index: number } {
  const lineStart = points[0];
  const lineEnd = points[points.length - 1];
  let dmax = 0; let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], lineStart, lineEnd);
    if (d > dmax) { dmax = d; index = i; }
  }
  return { dmax, index };
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x; const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  const projX = a.x + t * dx; const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

export type TracedPath = { d: string; length: number; area: number };

function polyLength(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  len += Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
  return len;
}

function polyArea(pts: Point[]): number {
  let area = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    area += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
  }
  return Math.abs(area / 2);
}

// Decimate points to an upper bound by taking approximately uniform samples
function decimatePoints(pts: Point[], maxPts: number): Point[] {
  if (pts.length <= maxPts) return pts;
  const out: Point[] = [];
  const step = (pts.length - 1) / (maxPts - 1);
  for (let i = 0; i < maxPts; i++) {
    const idx = Math.round(i * step);
    out.push(pts[Math.min(idx, pts.length - 1)]);
  }
  return out;
}

export function contoursToTracedPaths(contours: Point[][]): TracedPath[] {
  const out: TracedPath[] = [];
  for (const c of contours) {
    if (c.length < 3) continue;
    const d = `M ${c[0].x} ${c[0].y} ` + c.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
    out.push({ d, length: polyLength(c), area: polyArea(c) });
  }
  return out;
}

// Back-compat alias used in earlier revisions
// Some compile errors referenced contoursToPaths; keep this thin wrapper to be safe.
export function contoursToPaths(contours: Point[][]): string[] {
  return contoursToTracedPaths(contours).map(p => p.d);
}

export type TraceOptions = {
  maxContours?: number;
  pointBudget?: number;
  perContourMaxPoints?: number;
  timeBudgetMs?: number; // abort scan if exceeded
};

export function traceImageDataToPaths(
  imageData: ImageData,
  threshold: number,
  simplifyEps = 1.5,
  opts: TraceOptions = {}
): string[] {
  const { width, height } = imageData;
  const bin = binarize(imageData, threshold);
  const visited = new Uint8Array(width * height);
  const contours: Point[][] = [];
  // Safety caps to avoid pathological inputs exploding runtime/memory
  const MAX_CONTOURS = opts.maxContours ?? 1000; // hard cap on number of contours gathered
  const POINT_BUDGET = opts.pointBudget ?? 200_000; // total points across all contours
  const MAX_POINTS_PER_CONTOUR = opts.perContourMaxPoints ?? 4000;
  const TIME_BUDGET_MS = opts.timeBudgetMs ?? 0; // 0 = unlimited
  const start = TIME_BUDGET_MS > 0 ? Date.now() : 0;
  let pointTally = 0;
  let checked = 0;
  outer:
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (visited[i]) continue;
      if (!isBoundary(bin, width, height, x, y)) continue;
      const cont = traceContour(bin, width, height, x, y, visited);
      if (cont.length > 5) {
        let simp = rdp(cont, simplifyEps);
        // Hard limit per contour
        simp = decimatePoints(simp, MAX_POINTS_PER_CONTOUR);
        contours.push(simp);
      }
      if (contours.length >= MAX_CONTOURS) break outer;
      pointTally += cont.length;
      if (pointTally >= POINT_BUDGET) break outer;
      if ((++checked & 0x3fff) === 0 && TIME_BUDGET_MS && Date.now() - start > TIME_BUDGET_MS) break outer;
    }
  }
  return contoursToTracedPaths(contours).map(p => p.d);
}

export function traceImageDataToMetaPaths(
  imageData: ImageData,
  threshold: number,
  simplifyEps = 1.5,
  opts: TraceOptions = {}
): TracedPath[] {
  const { width, height } = imageData;
  const bin = binarize(imageData, threshold);
  const visited = new Uint8Array(width * height);
  const contours: Point[][] = [];
  // Safety caps mirroring traceImageDataToPaths
  const MAX_CONTOURS = opts.maxContours ?? 1000;
  const POINT_BUDGET = opts.pointBudget ?? 200_000;
  const MAX_POINTS_PER_CONTOUR = opts.perContourMaxPoints ?? 4000;
  const TIME_BUDGET_MS = opts.timeBudgetMs ?? 0;
  const start = TIME_BUDGET_MS > 0 ? Date.now() : 0;
  let pointTally = 0;
  let checked = 0;
  outer:
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (visited[i]) continue;
      if (!isBoundary(bin, width, height, x, y)) continue;
      const cont = traceContour(bin, width, height, x, y, visited);
      if (cont.length > 5) {
        let simp = rdp(cont, simplifyEps);
        simp = decimatePoints(simp, MAX_POINTS_PER_CONTOUR);
        contours.push(simp);
      }
      if (contours.length >= MAX_CONTOURS) break outer;
      pointTally += cont.length;
      if (pointTally >= POINT_BUDGET) break outer;
      if ((++checked & 0x3fff) === 0 && TIME_BUDGET_MS && Date.now() - start > TIME_BUDGET_MS) break outer;
    }
  }
  return contoursToTracedPaths(contours);
}
