// PathRuntime.ts
// Bulletproof SVG path runtime for animation: samples in local space, applies all transforms at render time.
// Used for both line reveal and hand follower. Never mutates SVG source.

export type Mat = [number, number, number, number, number, number]; // a,b,c,d,e,f
export interface Sample {
  x: number;
  y: number;
  s: number; // cumulative arc length
}

function mul(A: Mat, B: Mat): Mat {
  return [
    A[0]*B[0] + A[2]*B[1],
    A[1]*B[0] + A[3]*B[1],
    A[0]*B[2] + A[2]*B[3],
    A[1]*B[2] + A[3]*B[3],
    A[0]*B[4] + A[2]*B[5] + A[4],
    A[1]*B[4] + A[3]*B[5] + A[5],
  ];
}
export function apply(M: Mat, x: number, y: number) {
  return { x: M[0]*x + M[2]*y + M[4], y: M[1]*x + M[3]*y + M[5] };
}

export class PathRuntime {
  samples: Sample[] = [];
  total: number = 0;
  Mworld: Mat;

  constructor(
    d: string,
    pathMatrix: Mat | undefined,
    viewBox: { x:number; y:number; width:number; height:number },
    canvasSize: { w:number; h:number },
    dpr: number,
    objTransform: { x:number; y:number; rotation:number; scaleX:number; scaleY:number },
    sampleDistance = 1.0 // px in local units
  ) {
    // 1) sample local geometry
    this.samples = sampleSvgPath(d, sampleDistance);
    this.total = this.samples.length ? this.samples[this.samples.length-1].s : 0;
    // 2) precompute world transform
    const M_dpr: Mat = [dpr,0,0,dpr,0,0];
    const sx = canvasSize.w / viewBox.width;
    const sy = canvasSize.h / viewBox.height;
    const M_vb: Mat = [sx,0,0,sy,-viewBox.x*sx,-viewBox.y*sy];
    const M_path = pathMatrix ?? [1,0,0,1,0,0];
    const { x, y, rotation, scaleX, scaleY } = objTransform;
    const r = (rotation || 0) * Math.PI/180, c = Math.cos(r), s = Math.sin(r);
    const M_s: Mat = [scaleX||1,0,0,scaleY||1,0,0];
    const M_r: Mat = [c,s,-s,c,0,0];
    const M_t: Mat = [1,0,0,1,x||0,y||0];
    const M_obj = mul(M_t, mul(M_r, M_s));
    this.Mworld = mul(M_dpr, mul(M_obj, mul(M_vb, M_path)));
  }

  // arc-length lookup → local-space point (linear interp between samples)
  pointAtS(sQuery: number) {
    const s = Math.max(0, Math.min(this.total, sQuery));
    let lo = 0, hi = this.samples.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      (this.samples[mid].s < s) ? (lo = mid + 1) : (hi = mid);
    }
    const i = Math.max(1, Math.min(this.samples.length - 1, lo));
    const A = this.samples[i-1], B = this.samples[i];
    const t = (s - A.s) / Math.max(1e-6, B.s - A.s);
    return { x: A.x + t*(B.x - A.x), y: A.y + t*(B.y - A.y) };
  }

  // world-space pose (x,y,theta) at arc-length s
  worldPoseAtS(s: number, eps = 0.75) {
    const Pm = this.pointAtS(Math.max(0, s - eps));
    const P  = this.pointAtS(s);
    const Pp = this.pointAtS(Math.min(this.total, s + eps));
    const Wm = apply(this.Mworld, Pm.x, Pm.y);
    const W  = apply(this.Mworld,  P.x,  P.y);
    const Wp = apply(this.Mworld, Pp.x, Pp.y);
    const theta = Math.atan2(Wp.y - Wm.y, Wp.x - Wm.x);
    return { x: W.x, y: W.y, theta };
  }
}

// Helper: sample SVG path in local space, never mutates SVG
function sampleSvgPath(d: string, sampleDistance: number): Sample[] {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.left = '-99999px';
  svg.style.top = '-99999px';
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  document.body.appendChild(svg);
  const samples: Sample[] = [];
  try {
    let totalLength = path.getTotalLength();
    if (!isFinite(totalLength) || totalLength < 0) totalLength = 0;
    const MIN_LEN = 1e-3;
    if (totalLength < MIN_LEN) {
      const p0 = path.getPointAtLength(0);
      const p1 = path.getPointAtLength(totalLength);
      samples.push({ x: p0.x, y: p0.y, s: 0 });
      samples.push({ x: p1.x, y: p1.y, s: totalLength });
      document.body.removeChild(svg);
      return samples;
    }
    const maxSamples = Math.max(500, Math.ceil(totalLength / sampleDistance));
    const minStep = Math.max(sampleDistance, totalLength / maxSamples);
    let currentLength = 0;
    while (currentLength <= totalLength) {
      const pt = path.getPointAtLength(currentLength);
      samples.push({ x: pt.x, y: pt.y, s: currentLength });
      currentLength += minStep;
    }
    if (samples.length === 0 || samples[samples.length - 1].s < totalLength) {
      const pt = path.getPointAtLength(totalLength);
      samples.push({ x: pt.x, y: pt.y, s: totalLength });
    }
  } catch (e) {
    // fallback: empty
  } finally {
    document.body.removeChild(svg);
  }
  return samples;
}
