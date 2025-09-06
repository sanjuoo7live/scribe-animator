import type { ImportOptions } from './types';
import type { ExtractedSvg } from './extractPaths';

const ABS_MIN_PATH_LEN = 8; // px
const MAX_TOTAL_PATH_LEN = 1_500_000; // px
const HARD_MAX_KEEP = 400;

function cubicLen(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): number {
  let len = 0;
  let prevX = x1;
  let prevY = y1;
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * mt * x1 + 3 * mt * mt * t * x2 + 3 * mt * t * t * x3 + t * t * t * x4;
    const y = mt * mt * mt * y1 + 3 * mt * mt * t * y2 + 3 * mt * t * t * y3 + t * t * t * y4;
    len += Math.hypot(x - prevX, y - prevY);
    prevX = x; prevY = y;
  }
  return len;
}

function quadraticLen(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): number {
  let len = 0;
  let prevX = x1;
  let prevY = y1;
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * x1 + 2 * mt * t * x2 + t * t * x3;
    const y = mt * mt * y1 + 2 * mt * t * y2 + t * t * y3;
    len += Math.hypot(x - prevX, y - prevY);
    prevX = x; prevY = y;
  }
  return len;
}

export function pathLength(d: string): number {
  const re = /([MLCQSZ])([^MLCQSZ]*)/g;
  let match: RegExpExecArray | null;
  let cur = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  let len = 0;
  let prevC: { x: number; y: number } | null = null;
  while ((match = re.exec(d))) {
    const cmd = match[1];
    const nums = match[2].trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    if (cmd === 'M') {
      cur = { x: nums[0], y: nums[1] };
      start = { ...cur };
      for (let i = 2; i < nums.length; i += 2) {
        const pt = { x: nums[i], y: nums[i + 1] };
        len += Math.hypot(pt.x - cur.x, pt.y - cur.y);
        cur = pt;
      }
      prevC = null;
    } else if (cmd === 'L') {
      for (let i = 0; i < nums.length; i += 2) {
        const pt = { x: nums[i], y: nums[i + 1] };
        len += Math.hypot(pt.x - cur.x, pt.y - cur.y);
        cur = pt;
      }
      prevC = null;
    } else if (cmd === 'C') {
      for (let i = 0; i < nums.length; i += 6) {
        len += cubicLen(cur.x, cur.y, nums[i], nums[i + 1], nums[i + 2], nums[i + 3], nums[i + 4], nums[i + 5]);
        cur = { x: nums[i + 4], y: nums[i + 5] };
        prevC = { x: nums[i + 2], y: nums[i + 3] };
      }
    } else if (cmd === 'S') {
      for (let i = 0; i < nums.length; i += 4) {
        const cp = prevC ? { x: 2 * cur.x - prevC.x, y: 2 * cur.y - prevC.y } : { ...cur };
        len += cubicLen(cur.x, cur.y, cp.x, cp.y, nums[i], nums[i + 1], nums[i + 2], nums[i + 3]);
        cur = { x: nums[i + 2], y: nums[i + 3] };
        prevC = { x: nums[i], y: nums[i + 1] };
      }
    } else if (cmd === 'Q') {
      for (let i = 0; i < nums.length; i += 4) {
        len += quadraticLen(cur.x, cur.y, nums[i], nums[i + 1], nums[i + 2], nums[i + 3]);
        cur = { x: nums[i + 2], y: nums[i + 3] };
      }
      prevC = null;
    } else if (cmd === 'Z') {
      len += Math.hypot(start.x - cur.x, start.y - cur.y);
      cur = { ...start };
      prevC = null;
    }
  }
  return len;
}

export function validate(flat: ExtractedSvg, options: ImportOptions): ExtractedSvg {
  const { maxElements, maxCommandsPerPath, skipTinySegmentsPx } = options;
  if (typeof maxElements === 'number') {
    const totalEls = flat.doc.getElementsByTagName('*').length;
    if (totalEls > maxElements) {
      throw new Error(`SVG has ${totalEls} elements, exceeds maxElements ${maxElements}`);
    }
  }
  if (typeof maxCommandsPerPath === 'number') {
    flat.paths.forEach(p => {
      const cmdCount = (p.d.match(/[a-zA-Z]/g) || []).length;
      if (cmdCount > maxCommandsPerPath) {
        throw new Error(`Path exceeds maxCommandsPerPath (${cmdCount} > ${maxCommandsPerPath})`);
      }
    });
  }

  const eps = skipTinySegmentsPx ?? 0;
  const filtered = flat.paths
    .map(p => {
      const L = pathLength(p.d);
      p.len = L;
      return p;
    })
    .filter(p => p.len! >= Math.max(ABS_MIN_PATH_LEN, eps, (p.strokeWidth || 0) * 0.5));

  let capped = filtered.slice(0, Math.min(filtered.length, HARD_MAX_KEEP));
  let totalLen = Math.max(1, capped.reduce((sum, p) => sum + (p.len || 0), 0));
  if (totalLen > MAX_TOTAL_PATH_LEN) {
    const limited: typeof capped = [];
    let acc = 0;
    for (const p of capped) {
      const L = p.len || 0;
      if (acc + L > MAX_TOTAL_PATH_LEN) break;
      limited.push(p);
      acc += L;
    }
    if (limited.length >= 50) {
      capped = limited;
      totalLen = acc;
    } else {
      const floor = Math.max(50, Math.floor(HARD_MAX_KEEP / 4));
      capped = capped.slice(0, Math.min(capped.length, floor));
      totalLen = Math.max(1, capped.reduce((s, p) => s + (p.len || 0), 0));
    }
  }

  if (capped.length < filtered.length) {
    flat.warnings.push(
      `Capped ${filtered.length}→${capped.length} paths (cap ${HARD_MAX_KEEP} paths / length≈${(MAX_TOTAL_PATH_LEN / 1_000_000).toFixed(1)}M, added≈${Math.round(totalLen)}).`
    );
  }

  flat.paths = capped;
  return flat;
}
