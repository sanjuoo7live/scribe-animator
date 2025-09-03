// Precise SVG path length measurement with optional transform scaling
// Uses DOM SVGPathElement.getTotalLength for accuracy

const SVG_NS = 'http://www.w3.org/2000/svg';

export function measurePathLength(d: string): number {
  try {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    // Must be attached to measure in some browsers
    // We attach to a temporary hidden SVG
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.left = '-10000px';
    svg.style.top = '-10000px';
    svg.appendChild(path);
    document.body.appendChild(svg);
    const len = (path as unknown as SVGPathElement).getTotalLength();
    svg.remove();
    return isFinite(len) ? len : 0;
  } catch {
    return 0;
  }
}

// Estimate effective scale from a 2x3 affine matrix [a,b,c,d,e,f]
// We approximate length scaling by the average of scaleX and scaleY magnitudes
export function estimateScaleFromMatrix(m?: number[]): number {
  if (!m || m.length < 4) return 1;
  const a = m[0], b = m[1], c = m[2], d = m[3];
  const scaleX = Math.hypot(a, c);
  const scaleY = Math.hypot(b, d);
  const s = (scaleX + scaleY) / 2;
  return isFinite(s) && s > 0 ? s : 1;
}

export function measureScaledPathLength(d: string, matrix?: number[]): number {
  const base = measurePathLength(d);
  const s = estimateScaleFromMatrix(matrix);
  return base * s;
}
