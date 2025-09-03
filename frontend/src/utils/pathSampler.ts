/**
 * Draw a partial polyline up to a given arc-length using CanvasRenderingContext2D.
 * @param ctx Canvas context
 * @param samples Array of PathPoint (sampled polyline)
 * @param visibleLength Arc-length to reveal (in same units as cumulativeLength)
 * @param transform Optional: function to map (x, y) to world/canvas space
 */
export function drawPartialPolyline(
  ctx: CanvasRenderingContext2D,
  samples: PathPoint[],
  visibleLength: number,
  transform?: (pt: {x:number, y:number}) => {x:number, y:number}
) : boolean {
  if (!samples.length || visibleLength <= 0) return false;
  let i = 0;
  for (; i < samples.length && samples[i].cumulativeLength <= visibleLength; i++) {}
  ctx.beginPath();
  const first = transform ? transform(samples[0]) : samples[0];
  ctx.moveTo(first.x, first.y);
  for (let k = 1; k < i; k++) {
    const pt = transform ? transform(samples[k]) : samples[k];
    ctx.lineTo(pt.x, pt.y);
  }
  // Partial last segment
  if (i < samples.length && i > 0) {
    const A = samples[i-1], B = samples[i];
    const t = (visibleLength - A.cumulativeLength) / Math.max(1e-6, B.cumulativeLength - A.cumulativeLength);
    const x = A.x + t * (B.x - A.x);
    const y = A.y + t * (B.y - A.y);
    const pt = transform ? transform({x, y}) : {x, y};
    ctx.lineTo(pt.x, pt.y);
  }
  return true;
}
/**
 * SVG Path Sampling System for Hand Follower
 * 
 * This utility provides functions to sample SVG paths at regular intervals,
 * calculate progress along paths, and determine tangent angles for realistic
 * hand rotation during animation.
 */

export interface PathPoint {
  x: number;
  y: number;
  cumulativeLength: number;
  tangentAngle: number; // in radians
  segmentIndex: number;
}

export class PathSampler {
  private static cache = new Map<string, PathPoint[]>();
  private static applyMatrix(point: { x: number; y: number }, matrix?: number[]) {
    if (!matrix || matrix.length < 6) return { x: point.x, y: point.y };
    const [a, b, c, d, e, f] = matrix;
    return {
      x: a * point.x + c * point.y + e,
      y: b * point.x + d * point.y + f,
    };
  }
  /**
   * Sample an SVG path at regular intervals to create path points
   * @param pathData SVG path data string (d attribute)
   * @param sampleDistance Distance between samples in pixels (default: 2)
   * @returns Array of PathPoint objects
   */
  static samplePath(pathData: string, sampleDistance: number = 2, matrix?: number[], maxSamples: number = 5000): PathPoint[] {
    const matKey = (matrix && matrix.length >= 6) ? matrix.join(',') : 'nomat';
    const cacheKey = `${pathData}|mat:${matKey}|sd:${sampleDistance}|max:${maxSamples}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    // Create a temporary SVG path element to measure
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.left = '-99999px';
    svg.style.top = '-99999px';
    
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    document.body.appendChild(svg);

  const samples: PathPoint[] = [];
    
    try {
      let totalLength = path.getTotalLength();
      if (!isFinite(totalLength) || totalLength < 0) totalLength = 0;
      // Guard for extremely tiny paths to avoid degenerate tangents
      const MIN_LEN = 1e-3;
      if (totalLength < MIN_LEN) {
        const p0 = path.getPointAtLength(0);
        const p1 = path.getPointAtLength(totalLength);
        const P0 = this.applyMatrix({ x: p0.x, y: p0.y }, matrix);
        const P1 = this.applyMatrix({ x: p1.x, y: p1.y }, matrix);
        const a = Math.atan2(P1.y - P0.y, P1.x - P0.x);
        const result = [{ x: P0.x, y: P0.y, cumulativeLength: 0, tangentAngle: a, segmentIndex: 0 }];
        document.body.removeChild(svg);
        this.cache.set(cacheKey, result);
        return result;
      }

      // Adaptive step: cap number of samples
      const desiredStep = sampleDistance;
      const maxAllowed = Math.max(500, maxSamples);
      const minStep = Math.max(desiredStep, totalLength / maxAllowed);
      
      if (totalLength === 0) {
        document.body.removeChild(svg);
        return samples;
      }

  let currentLength = 0;
      let segmentIndex = 0;
      let previousAngle = 0;
  // no-op variable retained in case of future smoothing; currently unused
      
  while (currentLength <= totalLength) {
  const svgPoint = path.getPointAtLength(currentLength);
  const appliedPoint = this.applyMatrix({ x: svgPoint.x, y: svgPoint.y }, matrix);
        
    // Calculate tangent angle by looking ahead slightly
    const lookAheadDistance = Math.min(1, totalLength - currentLength);
  const svgNextPoint = path.getPointAtLength(currentLength + lookAheadDistance);
  const appliedNextPoint = this.applyMatrix({ x: svgNextPoint.x, y: svgNextPoint.y }, matrix);

  const dx = appliedNextPoint.x - appliedPoint.x;
  const dy = appliedNextPoint.y - appliedPoint.y;
        let tangentAngle = Math.atan2(dy, dx);
        
        // Smooth angle transitions to prevent jumps during semicircular movements
        if (samples.length > 0) {
          const angleDiff = tangentAngle - previousAngle;
          
          // Handle angle wrapping (crossing -π/π boundary)
          if (angleDiff > Math.PI) {
            tangentAngle -= 2 * Math.PI;
          } else if (angleDiff < -Math.PI) {
            tangentAngle += 2 * Math.PI;
          }
        }
        previousAngle = tangentAngle;
        
        samples.push({
          x: appliedPoint.x,
          y: appliedPoint.y,
          cumulativeLength: currentLength,
          tangentAngle,
          segmentIndex
        });
  // prevLocal not needed when using path cumulative length
        
  currentLength += minStep;
        
        // Increment segment index at path breaks (basic heuristic)
        if (currentLength > 0 && currentLength % (totalLength / 10) < sampleDistance) {
          segmentIndex++;
        }
      }
      
      // Ensure we have the final point
  if (samples.length === 0 || samples[samples.length - 1].cumulativeLength < totalLength) {
        const svgFinalPoint = path.getPointAtLength(totalLength);
        const appliedFinalPoint = this.applyMatrix({ x: svgFinalPoint.x, y: svgFinalPoint.y }, matrix);
        const prevPoint = samples.length > 0 ? samples[samples.length - 1] : { x: appliedFinalPoint.x, y: appliedFinalPoint.y, cumulativeLength: 0, tangentAngle: 0, segmentIndex } as PathPoint;

        const dx = appliedFinalPoint.x - prevPoint.x;
        const dy = appliedFinalPoint.y - prevPoint.y;
        const tangentAngle = Math.atan2(dy, dx);
        samples.push({
          x: appliedFinalPoint.x,
          y: appliedFinalPoint.y,
          cumulativeLength: totalLength,
          tangentAngle,
          segmentIndex
        });
      }
      
      // Store in cache
      this.cache.set(cacheKey, samples);

    } catch (error) {
      console.warn('Error sampling SVG path:', error);
    } finally {
      document.body.removeChild(svg);
    }
    
    return this.cache.get(cacheKey) || samples;
  }

  /**
   * Get the point at a specific progress along the sampled path
   * @param samples Pre-sampled path points
   * @param progress Progress from 0 to 1
   * @returns Interpolated path point
   */
  static getPointAtProgress(samples: PathPoint[], progress: number): PathPoint | null {
    if (samples.length === 0) return null;
    
    const clampedProgress = Math.max(0, Math.min(1, progress));
    
    if (clampedProgress === 0) return samples[0];
    if (clampedProgress === 1) return samples[samples.length - 1];
    
    const totalLength = samples[samples.length - 1].cumulativeLength;
    const targetLength = clampedProgress * totalLength;
    
    // Find the two points that bracket our target length
    for (let i = 0; i < samples.length - 1; i++) {
      const currentSample = samples[i];
      const nextSample = samples[i + 1];
      
      if (targetLength >= currentSample.cumulativeLength && targetLength <= nextSample.cumulativeLength) {
        // Interpolate between the two points
        const segmentLength = nextSample.cumulativeLength - currentSample.cumulativeLength;
        const segmentProgress = segmentLength > 0 
          ? (targetLength - currentSample.cumulativeLength) / segmentLength 
          : 0;
        
        return {
          x: currentSample.x + (nextSample.x - currentSample.x) * segmentProgress,
          y: currentSample.y + (nextSample.y - currentSample.y) * segmentProgress,
          cumulativeLength: targetLength,
          tangentAngle: this.interpolateAngle(currentSample.tangentAngle, nextSample.tangentAngle, segmentProgress),
          segmentIndex: currentSample.segmentIndex
        };
      }
    }
    
    // Fallback to last point
    return samples[samples.length - 1];
  }

  /**
   * Get the tangent angle at a specific progress along the path
   * @param samples Pre-sampled path points
   * @param progress Progress from 0 to 1
   * @returns Tangent angle in radians
   */
  static getTangentAtProgress(samples: PathPoint[], progress: number): number {
    const point = this.getPointAtProgress(samples, progress);
    return point?.tangentAngle || 0;
  }

  /**
   * Interpolate between two angles, handling wrap-around
   * @param angle1 First angle in radians
   * @param angle2 Second angle in radians
   * @param t Interpolation factor (0-1)
   * @returns Interpolated angle in radians
   */
  private static interpolateAngle(angle1: number, angle2: number, t: number): number {
    // Ensure angles are in [-π, π] range
    const normalizeAngle = (angle: number) => {
      while (angle > Math.PI) angle -= 2 * Math.PI;
      while (angle < -Math.PI) angle += 2 * Math.PI;
      return angle;
    };

    angle1 = normalizeAngle(angle1);
    angle2 = normalizeAngle(angle2);

    // Find the shortest path between angles
    let diff = angle2 - angle1;
    if (diff > Math.PI) {
      diff -= 2 * Math.PI;
    } else if (diff < -Math.PI) {
      diff += 2 * Math.PI;
    }

    return normalizeAngle(angle1 + diff * t);
  }

  /**
   * Create a cached sampler for a specific path
   * Useful for performance when the same path is sampled multiple times
   */
  static createCachedSampler(pathData: string, sampleDistance: number = 2, matrix?: number[], maxSamples: number = 5000) {
    const samples = this.samplePath(pathData, sampleDistance, matrix, maxSamples);
    
    return {
      samples,
  getPointAtProgress: (progress: number) => this.getPointAtProgress(samples, progress),
  getTangentAtProgress: (progress: number) => this.getTangentAtProgress(samples, progress),
      getTotalLength: () => samples.length > 0 ? samples[samples.length - 1].cumulativeLength : 0
    };
  }
}
