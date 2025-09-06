import type { ImportOptions } from './types';
import type { ParsedSvg } from './parse';

export type ExtractedSvg = ParsedSvg & {
  paths: RawPath[];
  warnings: string[];
};

export type RawPath = {
  id?: string;
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  len?: number;
};

const MAX_USE_DEPTH = 10;

// Matrix helpers
 type Mat = [number, number, number, number, number, number];
 const I: Mat = [1, 0, 0, 1, 0, 0];
 const mul = (m1: Mat, m2: Mat): Mat => [
   m1[0] * m2[0] + m1[2] * m2[1],
   m1[1] * m2[0] + m1[3] * m2[1],
   m1[0] * m2[2] + m1[2] * m2[3],
   m1[1] * m2[2] + m1[3] * m2[3],
   m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
   m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
 ];
 const apply = (m: Mat, x: number, y: number) => ({
   x: m[0] * x + m[2] * y + m[4],
   y: m[1] * x + m[3] * y + m[5]
 });
 const parseT = (str: string | null): Mat => {
   if (!str) return I;
   let m: Mat = I;
   const regex = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
   let match: RegExpExecArray | null;
   while ((match = regex.exec(str))) {
     const fn = match[1];
     const args = match[2].split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
     let t: Mat = I;
     switch (fn) {
       case 'matrix': if (args.length === 6) t = [args[0], args[1], args[2], args[3], args[4], args[5]]; break;
       case 'translate': t = [1,0,0,1,args[0]||0,args[1]||0]; break;
       case 'scale': t = [args[0]||1,0,0,args.length>1?args[1]:args[0]||1,0,0]; break;
       case 'rotate': {
         const a=(args[0]||0)*Math.PI/180; const cos=Math.cos(a); const sin=Math.sin(a);
         if (args.length>2) {
           const [cx,cy]=[args[1],args[2]]; t = mul(mul([1,0,0,1,cx,cy],[cos,sin,-sin,cos,0,0]),[1,0,0,1,-cx,-cy]);
         } else t=[cos,sin,-sin,cos,0,0];
         break;
       }
       case 'skewX': { const tval=Math.tan((args[0]||0)*Math.PI/180); t=[1,0,tval,1,0,0]; break; }
       case 'skewY': { const tval=Math.tan((args[0]||0)*Math.PI/180); t=[1,tval,0,1,0,0]; break; }
     }
     m = mul(m, t);
   }
   return m;
 };

// Path data parser and transformer (minimal but covers common commands)
const CMD_RE = /([a-zA-Z])([^a-zA-Z]*)/g;

// Convert an elliptical arc to a sequence of cubic bezier curves.
// Adapted from https://github.com/fontello/svgpath (MIT)
function arcToCubic(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  angle: number,
  largeArc: number,
  sweep: number,
  x2: number,
  y2: number
): number[][] {
  const rad = (Math.PI / 180) * angle;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);

  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  let x1p = cos * dx + sin * dy;
  let y1p = -sin * dx + cos * dy;

  rx = Math.abs(rx);
  ry = Math.abs(ry);

  let lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const factor = Math.sqrt(lambda);
    rx *= factor;
    ry *= factor;
  }

  const rx2 = rx * rx;
  const ry2 = ry * ry;
  const sign = largeArc === sweep ? -1 : 1;
  const sq =
    ((rx2 * ry2) - (rx2 * y1p * y1p) - (ry2 * x1p * x1p)) /
    (rx2 * y1p * y1p + ry2 * x1p * x1p);
  const coef = sign * Math.sqrt(Math.max(0, sq));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;

  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;

  const vectorAngle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const mag = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
    let ang = Math.acos(Math.min(Math.max(dot / mag, -1), 1));
    if (ux * vy - uy * vx < 0) ang = -ang;
    return ang;
  };

  const v1x = (x1p - cxp) / rx;
  const v1y = (y1p - cyp) / ry;
  const v2x = (-x1p - cxp) / rx;
  const v2y = (-y1p - cyp) / ry;

  let startAngle = vectorAngle(1, 0, v1x, v1y);
  let sweepAngle = vectorAngle(v1x, v1y, v2x, v2y);
  if (!sweep && sweepAngle > 0) sweepAngle -= 2 * Math.PI;
  if (sweep && sweepAngle < 0) sweepAngle += 2 * Math.PI;

  const segs = Math.ceil(Math.abs(sweepAngle / (Math.PI / 2)));
  const step = sweepAngle / segs;
  const curves: number[][] = [];

  for (let i = 0; i < segs; i++) {
    const t1 = startAngle + i * step;
    const t2 = t1 + step;
    const delta = t2 - t1;
    const alpha = Math.tan(delta / 4) * (4 / 3);

    const x1 = cx + rx * (cos * Math.cos(t1) - sin * Math.sin(t1));
    const y1 = cy + ry * (sin * Math.cos(t1) + cos * Math.sin(t1));
    const x2 = cx + rx * (cos * Math.cos(t2) - sin * Math.sin(t2));
    const y2 = cy + ry * (sin * Math.cos(t2) + cos * Math.sin(t2));

    const dx1 = -rx * (cos * Math.sin(t1) + sin * Math.cos(t1));
    const dy1 = -ry * (sin * Math.sin(t1) - cos * Math.cos(t1));
    const dx2 = rx * (cos * Math.sin(t2) + sin * Math.cos(t2));
    const dy2 = ry * (sin * Math.sin(t2) - cos * Math.cos(t2));

    curves.push([
      x1 + alpha * dx1,
      y1 + alpha * dy1,
      x2 - alpha * dx2,
      y2 - alpha * dy2,
      x2,
      y2
    ]);
  }

  return curves;
}

function transformPathData(d: string, m: Mat, eps: number): string {
  const segs: string[] = [];
  let match: RegExpExecArray | null;
  let current = { x: 0, y: 0 }; // last absolute point before transform
  let lastOut = { x: 0, y: 0 }; // last emitted point after transform
  while ((match = CMD_RE.exec(d))) {
    const cmd = match[1];
    let up = cmd.toUpperCase();
    const isRel = cmd !== up;
    const raw = match[2].trim();
    const nums = raw ? raw.split(/[\s,]+/).map(Number).filter(n => !isNaN(n)) : [];
    let vals = nums.slice();
    const startAbs = { ...current };

    // Convert to absolute coordinates
    const abs = (i: number, j: number) => {
      if (isRel) { vals[i] += current.x; vals[j] += current.y; }
    };
    switch (up) {
      case 'M':
      case 'L':
      case 'T':
        for (let i = 0; i < vals.length; i += 2) {
          abs(i, i + 1);
          current = { x: vals[i], y: vals[i + 1] };
        }
        break;
      case 'H':
        for (let i = 0; i < vals.length; i++) {
          vals[i] = isRel ? vals[i] + current.x : vals[i];
          current.x = vals[i];
          vals.splice(2 * i + 1, 0, current.y);
        }
        up = 'L';
        break;
      case 'V':
        for (let i = 0; i < vals.length; i++) {
          vals[i] = isRel ? vals[i] + current.y : vals[i];
          current.y = vals[i];
          vals.splice(2 * i, 0, current.x);
        }
        up = 'L';
        break;
      case 'C':
        for (let i = 0; i < vals.length; i += 6) {
          abs(i, i + 1);
          abs(i + 2, i + 3);
          abs(i + 4, i + 5);
          current = { x: vals[i + 4], y: vals[i + 5] };
        }
        break;
      case 'S':
      case 'Q':
        for (let i = 0; i < vals.length; i += 4) {
          abs(i, i + 1);
          abs(i + 2, i + 3);
          current = { x: vals[i + 2], y: vals[i + 3] };
        }
        break;
      case 'A':
        for (let i = 0; i < vals.length; i += 7) {
          abs(i + 5, i + 6);
          current = { x: vals[i + 5], y: vals[i + 6] };
        }
        break;
      case 'Z':
        break;
    }

    // Apply matrix & skip tiny segments
    if (up === 'M' || up === 'L' || up === 'T') {
      const out: number[] = [];
      for (let i = 0; i < vals.length; i += 2) {
        const p = apply(m, vals[i], vals[i + 1]);
        const x = +p.x.toFixed(3);
        const y = +p.y.toFixed(3);
        if (up !== 'M') {
          const dx = x - lastOut.x;
          const dy = y - lastOut.y;
          if (Math.hypot(dx, dy) < eps) continue;
        }
        out.push(x, y);
        lastOut = { x, y };
      }
      if (out.length) segs.push(`${up} ${out.join(' ')}`);
      continue;
    }

    switch (up) {
      case 'C':
        for (let i = 0; i < vals.length; i += 6) {
          const p1 = apply(m, vals[i], vals[i + 1]);
          const p2 = apply(m, vals[i + 2], vals[i + 3]);
          const p3 = apply(m, vals[i + 4], vals[i + 5]);
          vals[i] = +p1.x.toFixed(3); vals[i + 1] = +p1.y.toFixed(3);
          vals[i + 2] = +p2.x.toFixed(3); vals[i + 3] = +p2.y.toFixed(3);
          vals[i + 4] = +p3.x.toFixed(3); vals[i + 5] = +p3.y.toFixed(3);
          lastOut = { x: vals[i + 4], y: vals[i + 5] };
        }
        break;
      case 'S':
      case 'Q':
        for (let i = 0; i < vals.length; i += 4) {
          const p1 = apply(m, vals[i], vals[i + 1]);
          const p2 = apply(m, vals[i + 2], vals[i + 3]);
          vals[i] = +p1.x.toFixed(3); vals[i + 1] = +p1.y.toFixed(3);
          vals[i + 2] = +p2.x.toFixed(3); vals[i + 3] = +p2.y.toFixed(3);
          lastOut = { x: vals[i + 2], y: vals[i + 3] };
        }
        break;
      case 'A': {
        let prev = startAbs;
        for (let i = 0; i < vals.length; i += 7) {
          const curves = arcToCubic(
            prev.x,
            prev.y,
            vals[i],
            vals[i + 1],
            vals[i + 2],
            vals[i + 3],
            vals[i + 4],
            vals[i + 5],
            vals[i + 6]
          );
          prev = { x: vals[i + 5], y: vals[i + 6] };
          curves.forEach(c => {
            const p1 = apply(m, c[0], c[1]);
            const p2 = apply(m, c[2], c[3]);
            const p3 = apply(m, c[4], c[5]);
            const x1 = +p1.x.toFixed(3);
            const y1 = +p1.y.toFixed(3);
            const x2 = +p2.x.toFixed(3);
            const y2 = +p2.y.toFixed(3);
            const x3 = +p3.x.toFixed(3);
            const y3 = +p3.y.toFixed(3);
            const dx = x3 - lastOut.x;
            const dy = y3 - lastOut.y;
            if (Math.hypot(dx, dy) < eps) return;
            segs.push(`C ${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`);
            lastOut = { x: x3, y: y3 };
          });
        }
        lastOut = apply(m, prev.x, prev.y);
        continue;
      }
      case 'Z':
        segs.push('Z');
        continue;
    }

    const seg = vals.length ? `${up} ${vals.join(' ')}` : up;
    segs.push(seg);
  }
  return segs.join(' ');
}

// Convert primitives into path data and collect style info
export function extractPaths(ast: ParsedSvg, options: ImportOptions): ExtractedSvg {
  const paths: RawPath[] = [];
  const warnings: string[] = [];
  const svg = ast.doc.documentElement;
  const stack = new Set<Element>();

  const visit = (el: Element, acc: Mat, depth: number) => {
    if (depth > MAX_USE_DEPTH) {
      warnings.push('<use> depth exceeded');
      return;
    }
    const m = mul(acc, parseT(el.getAttribute('transform')));
    const name = el.nodeName.toLowerCase();
    if (name === 'g' || name === 'svg') {
      Array.from(el.children).forEach(child => visit(child as Element, m, depth));
      return;
    }
    if (name === 'use') {
      const ref = (el.getAttribute('href') || el.getAttribute('xlink:href') || '').replace(/^#/, '');
      const target = ref ? ast.doc.getElementById(ref) : null;
      if (target) {
        if (stack.has(target)) {
          warnings.push(`<use> cycle detected: ${ref}`);
          return;
        }
        stack.add(target);
        visit(target, m, depth + 1);
        stack.delete(target);
      } else warnings.push(`<use> reference not found: ${ref}`);
      return;
    }

    const common = () => ({
      id: el.getAttribute('id') || undefined,
      fill: el.getAttribute('fill') || undefined,
      stroke: el.getAttribute('stroke') || undefined,
      strokeWidth: el.getAttribute('stroke-width') ? Number(el.getAttribute('stroke-width')) : undefined,
      opacity: el.getAttribute('opacity') ? Number(el.getAttribute('opacity')) : undefined
    });

    if (name === 'path') {
      const d = el.getAttribute('d');
      if (d) {
        paths.push({ ...common(), d: transformPathData(d, m, options.skipTinySegmentsPx ?? 0) });
      }
    } else if (name === 'rect') {
      const x = Number(el.getAttribute('x') || '0');
      const y = Number(el.getAttribute('y') || '0');
      const w = Number(el.getAttribute('width') || '0');
      const h = Number(el.getAttribute('height') || '0');
      const pts = [apply(m, x, y), apply(m, x + w, y), apply(m, x + w, y + h), apply(m, x, y + h)];
      const d = `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} L ${pts[2].x} ${pts[2].y} L ${pts[3].x} ${pts[3].y} Z`;
      paths.push({ ...common(), d });
    } else if (name === 'circle') {
      const cx = Number(el.getAttribute('cx') || '0');
      const cy = Number(el.getAttribute('cy') || '0');
      const r = Number(el.getAttribute('r') || '0');
      const segs = 32;
      const pts = Array.from({ length: segs }, (_, i) => {
        const a = (i / segs) * Math.PI * 2;
        return apply(m, cx + r * Math.cos(a), cy + r * Math.sin(a));
      });
      const d = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
      paths.push({ ...common(), d });
    } else if (name === 'ellipse') {
      const cx = Number(el.getAttribute('cx') || '0');
      const cy = Number(el.getAttribute('cy') || '0');
      const rx = Number(el.getAttribute('rx') || '0');
      const ry = Number(el.getAttribute('ry') || '0');
      const segs = 32;
      const pts = Array.from({ length: segs }, (_, i) => {
        const a = (i / segs) * Math.PI * 2;
        return apply(m, cx + rx * Math.cos(a), cy + ry * Math.sin(a));
      });
      const d = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
      paths.push({ ...common(), d });
    } else if (name === 'line') {
      const x1 = Number(el.getAttribute('x1') || '0');
      const y1 = Number(el.getAttribute('y1') || '0');
      const x2 = Number(el.getAttribute('x2') || '0');
      const y2 = Number(el.getAttribute('y2') || '0');
      const p1 = apply(m, x1, y1);
      const p2 = apply(m, x2, y2);
      const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
      paths.push({ ...common(), d });
    } else if (name === 'polyline' || name === 'polygon') {
      const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
      if (pts.length >= 2) {
        const first = apply(m, pts[0], pts[1]);
        let d = `M ${first.x} ${first.y}`;
        for (let i = 2; i < pts.length; i += 2) {
          const p = apply(m, pts[i], pts[i + 1]);
          d += ` L ${p.x} ${p.y}`;
        }
        if (name === 'polygon') d += ' Z';
        paths.push({ ...common(), d });
      }
    }
  };

  visit(svg, I, 0);
  return { ...ast, paths, warnings };
}

