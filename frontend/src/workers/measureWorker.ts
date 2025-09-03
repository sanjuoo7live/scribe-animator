import {
  Point,
  Mat,
  MeasureError,
  WorkerRequest,
  WorkerMessage,
} from './measureTypes';

const DEBUG = false;
const warn = (...args: any[]) => {
  if (DEBUG) console.warn(...args);
};

const MAX_TOKENS = 5000;
const tokenCache = new Map<string, string[]>();

function normalizePathData(raw: string): string {
  return raw.replace(/\u2212/g, '-').replace(/[^\S\r\n]+/g, ' ');
}

// Matches command letters or numbers (supports decimals, negatives, scientific notation)
function tokenize(d: string): string[] {
  d = normalizePathData(d);
  let tokens = tokenCache.get(d);
  if (tokens) {
    // refresh LRU
    tokenCache.delete(d);
    tokenCache.set(d, tokens);
    return tokens;
  }
  tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  tokenCache.set(d, tokens);
  if (tokenCache.size > MAX_TOKENS) {
    const k = tokenCache.keys().next().value as string;
    tokenCache.delete(k);
  }
  return tokens;
}

function transformPoint(pt: Point, m?: Mat): Point {
  if (!m) return pt;
  const [a, b, c, d, e, f] = m;
  return { x: pt.x * a + pt.y * c + e, y: pt.x * b + pt.y * d + f };
}

function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

const MAX_SEGS = 30;

function cubicLengthAdaptive(p0: Point, c1: Point, c2: Point, p3: Point, eps = 0.5): number {
  const distP = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const mid = (u: Point, v: Point): Point => ({ x: (u.x + v.x) / 2, y: (u.y + v.y) / 2 });
  const flat = (a: Point, b: Point, c: Point, d: Point) => {
    const ux = Math.abs(-a.x + 3 * b.x - 3 * c.x + d.x);
    const uy = Math.abs(-a.y + 3 * b.y - 3 * c.y + d.y);
    return Math.max(ux, uy) < eps * 16;
  };
  const subdiv = (a: Point, b: Point, c: Point, d: Point): number => {
    if (flat(a, b, c, d)) return distP(a, d);
    const ab = mid(a, b), bc = mid(b, c), cd = mid(c, d);
    const abc = mid(ab, bc), bcd = mid(bc, cd);
    const abcd = mid(abc, bcd);
    return subdiv(a, ab, abc, abcd) + subdiv(abcd, bcd, cd, d);
  };
  return subdiv(p0, c1, c2, p3);
}

function quadraticLengthAdaptive(p0: Point, c: Point, p2: Point, eps = 0.5): number {
  const c1 = { x: p0.x + (2 / 3) * (c.x - p0.x), y: p0.y + (2 / 3) * (c.y - p0.y) };
  const c2 = { x: p2.x + (2 / 3) * (c.x - p2.x), y: p2.y + (2 / 3) * (c.y - p2.y) };
  return cubicLengthAdaptive(p0, c1, c2, p2, eps);
}

function angle(u: Point, v: Point): number {
  const dot = u.x * v.x + u.y * v.y;
  const len = Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y);
  const cos = Math.min(1, Math.max(-1, dot / len));
  let ang = Math.acos(cos);
  if (u.x * v.y - u.y * v.x < 0) ang = -ang;
  return ang;
}

function arcLength(
  p0: Point,
  rx: number,
  ry: number,
  xAxisRotation: number,
  largeArc: number,
  sweep: number,
  p1: Point,
  m?: Mat
): number {
  rx = Math.abs(rx) || 0;
  ry = Math.abs(ry) || 0;
  if (rx === 0 || ry === 0) {
    return dist(transformPoint(p0, m), transformPoint(p1, m));
  }
  const phi = (xAxisRotation * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx2 = (p0.x - p1.x) / 2;
  const dy2 = (p0.y - p1.y) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;
  const rxSq = rx * rx;
  const rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  let radicant = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
  if (radicant < 0) {
    const scale = Math.sqrt(1 - radicant / (rxSq * rySq));
    rx *= scale;
    ry *= scale;
    radicant = 0;
  }
  const sign = largeArc === sweep ? -1 : 1;
  const coef = sign * Math.sqrt(radicant / (rxSq * y1pSq + rySq * x1pSq));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;

  const cx = cosPhi * cxp - sinPhi * cyp + (p0.x + p1.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (p0.y + p1.y) / 2;

  const v1 = { x: (x1p - cxp) / rx, y: (y1p - cyp) / ry };
  const v2 = { x: (-x1p - cxp) / rx, y: (-y1p - cyp) / ry };
  let theta1 = angle({ x: 1, y: 0 }, v1);
  let delta = angle(v1, v2);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;

  const skewOrScale = m
    ? Math.max(Math.abs(m[0]), Math.abs(m[1]), Math.abs(m[2]), Math.abs(m[3]))
    : 1;
  const segs = Math.min(
    MAX_SEGS,
    Math.max(5, Math.ceil((Math.abs(delta) / (Math.PI / 8)) * skewOrScale))
  );
  let len = 0;
  let prev: Point = {
    x: cosPhi * rx * Math.cos(theta1) - sinPhi * ry * Math.sin(theta1) + cx,
    y: sinPhi * rx * Math.cos(theta1) + cosPhi * ry * Math.sin(theta1) + cy,
  };
  prev = transformPoint(prev, m);
  for (let i = 1; i <= segs; i++) {
    const angle = theta1 + (delta * i) / segs;
    const pt: Point = {
      x: cosPhi * rx * Math.cos(angle) - sinPhi * ry * Math.sin(angle) + cx,
      y: sinPhi * rx * Math.cos(angle) + cosPhi * ry * Math.sin(angle) + cy,
    };
    const tr = transformPoint(pt, m);
    len += dist(prev, tr);
    prev = tr;
  }
  return len;
}

function measurePath(d: string, m?: Mat): number {
  const tokens = tokenize(d);
  if (!tokens.length) return 0;
  let idx = 0;
  let cmd = 'M';
  let cur: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  let len = 0;
  let lastControl2: Point | null = null;
  let lastQControl: Point | null = null;
  const read = () => {
    const v = parseFloat(tokens[idx++]);
    if (Number.isNaN(v)) throw new Error(`Invalid number at token ${idx}`);
    return v;
  };
  const readPoint = (rel: boolean): Point => {
    const x = read();
    const y = read();
    return rel ? { x: cur.x + x, y: cur.y + y } : { x, y };
  };
  const resetControls = () => {
    lastControl2 = null;
    lastQControl = null;
  };
  const handleLine = (rel: boolean) => {
    const p = readPoint(rel);
    len += dist(transformPoint(cur, m), transformPoint(p, m));
    cur = p;
    resetControls();
  };
  const handleHorizontal = (rel: boolean) => {
    const x = read();
    const p: Point = { x: rel ? cur.x + x : x, y: cur.y };
    len += dist(transformPoint(cur, m), transformPoint(p, m));
    cur = p;
    resetControls();
  };
  const handleVertical = (rel: boolean) => {
    const y = read();
    const p: Point = { x: cur.x, y: rel ? cur.y + y : y };
    len += dist(transformPoint(cur, m), transformPoint(p, m));
    cur = p;
    resetControls();
  };
  const handleCubic = (rel: boolean, smooth = false) => {
    const control1 = smooth
      ? lastControl2
        ? { x: 2 * cur.x - lastControl2.x, y: 2 * cur.y - lastControl2.y }
        : { ...cur }
      : readPoint(rel);
    const control2 = readPoint(rel);
    const end = readPoint(rel);
    len += cubicLengthAdaptive(
      transformPoint(cur, m),
      transformPoint(control1, m),
      transformPoint(control2, m),
      transformPoint(end, m)
    );
    cur = end;
    lastControl2 = control2;
    lastQControl = null;
  };
  const handleQuadratic = (rel: boolean, smooth = false) => {
    const control = smooth
      ? lastQControl
        ? { x: 2 * cur.x - lastQControl.x, y: 2 * cur.y - lastQControl.y }
        : { ...cur }
      : readPoint(rel);
    const end = readPoint(rel);
    len += quadraticLengthAdaptive(
      transformPoint(cur, m),
      transformPoint(control, m),
      transformPoint(end, m)
    );
    cur = end;
    lastQControl = control;
    lastControl2 = null;
  };
  const handleArc = (rel: boolean) => {
    const rx = Math.abs(read()) || 0;
    const ry = Math.abs(read()) || 0;
    const rotation = read();
    const large = read();
    const sweep = read();
    const end = readPoint(rel);
    len += arcLength(cur, rx, ry, rotation, large, sweep, end, m);
    cur = end;
    resetControls();
  };
  while (idx < tokens.length) {
    const token = tokens[idx];
    if (/[a-zA-Z]/.test(token)) {
      cmd = token;
      idx++;
    }
    switch (cmd) {
      case 'M':
        cur = readPoint(false);
        start = { ...cur };
        cmd = 'L';
        resetControls();
        break;
      case 'm':
        cur = readPoint(true);
        start = { ...cur };
        cmd = 'l';
        resetControls();
        break;
      case 'L':
        handleLine(false);
        break;
      case 'l':
        handleLine(true);
        break;
      case 'H':
        handleHorizontal(false);
        break;
      case 'h':
        handleHorizontal(true);
        break;
      case 'V':
        handleVertical(false);
        break;
      case 'v':
        handleVertical(true);
        break;
      case 'C':
        handleCubic(false);
        break;
      case 'c':
        handleCubic(true);
        break;
      case 'S':
        handleCubic(false, true);
        break;
      case 's':
        handleCubic(true, true);
        break;
      case 'Q':
        handleQuadratic(false);
        break;
      case 'q':
        handleQuadratic(true);
        break;
      case 'T':
        handleQuadratic(false, true);
        break;
      case 't':
        handleQuadratic(true, true);
        break;
      case 'A':
        handleArc(false);
        break;
      case 'a':
        handleArc(true);
        break;
      case 'Z':
      case 'z': {
        len += dist(transformPoint(cur, m), transformPoint(start, m));
        cur = { ...start };
        resetControls();
        break;
      }
      default: {
        warn(`Unsupported path command: ${cmd}`);
        idx++;
        resetControls();
        break;
      }
    }
  }
  return len;
}

const abortFlags = new Map<number, boolean>();

/* eslint-disable no-restricted-globals */
self.addEventListener('message', async (ev: MessageEvent<WorkerRequest>) => {
  const data = ev.data;
  if (data.type === 'abort') {
    abortFlags.set(data.id, true);
    return;
  }
  if (data.type !== 'measure') return;
  const { id, items } = data;
  const lens: number[] = [];
  const errors: MeasureError[] = [];
  let total = 0;
  let lastProgressTS = 0;
  const PROGRESS_MS = 120;
  const maybePostProgress = (done: number, totalItems: number) => {
    const now = performance.now();
    if (now - lastProgressTS >= PROGRESS_MS) {
      const msg: WorkerMessage = { id, type: 'progress', done, total: totalItems };
      self.postMessage(msg);
      lastProgressTS = now;
    }
  };
  try {
    for (let i = 0; i < items.length; i++) {
      if (abortFlags.get(id)) break;
      try {
        const L = measurePath(items[i].d, items[i].m);
        lens.push(L);
        total += L;
      } catch (e) {
        console.error('measureWorker path error', i, e);
        lens.push(0);
        errors.push({ index: i, message: (e as Error).message });
      }
      maybePostProgress(i + 1, items.length);
    }
    if (abortFlags.get(id)) {
      const msg: WorkerMessage = { id, type: 'abort' };
      self.postMessage(msg);
      return;
    }
    const msg: WorkerMessage = { id, type: 'result', lens, total, errors };
    self.postMessage(msg);
  } finally {
    abortFlags.delete(id);
  }
});
/* eslint-enable no-restricted-globals */

export {};
