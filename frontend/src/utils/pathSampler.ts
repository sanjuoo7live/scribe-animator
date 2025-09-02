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
  /**
   * Sample an SVG path at regular intervals to create path points
   * @param pathData SVG path data string (d attribute)
   * @param sampleDistance Distance between samples in pixels (default: 2)
   * @returns Array of PathPoint objects
   */
  static samplePath(pathData: string, sampleDistance: number = 2): PathPoint[] {
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
      const totalLength = path.getTotalLength();
      
      if (totalLength === 0) {
        document.body.removeChild(svg);
        return samples;
      }

      let currentLength = 0;
      let segmentIndex = 0;
      
      while (currentLength <= totalLength) {
        const point = path.getPointAtLength(currentLength);
        
        // Calculate tangent angle by looking ahead slightly
        const lookAheadDistance = Math.min(1, totalLength - currentLength);
        const nextPoint = path.getPointAtLength(currentLength + lookAheadDistance);
        
        const dx = nextPoint.x - point.x;
        const dy = nextPoint.y - point.y;
        const tangentAngle = Math.atan2(dy, dx);
        
        samples.push({
          x: point.x,
          y: point.y,
          cumulativeLength: currentLength,
          tangentAngle,
          segmentIndex
        });
        
        currentLength += sampleDistance;
        
        // Increment segment index at path breaks (basic heuristic)
        if (currentLength > 0 && currentLength % (totalLength / 10) < sampleDistance) {
          segmentIndex++;
        }
      }
      
      // Ensure we have the final point
      if (samples.length === 0 || samples[samples.length - 1].cumulativeLength < totalLength) {
        const finalPoint = path.getPointAtLength(totalLength);
        const prevPoint = samples.length > 0 ? samples[samples.length - 1] : finalPoint;
        
        const dx = finalPoint.x - prevPoint.x;
        const dy = finalPoint.y - prevPoint.y;
        const tangentAngle = Math.atan2(dy, dx);
        
        samples.push({
          x: finalPoint.x,
          y: finalPoint.y,
          cumulativeLength: totalLength,
          tangentAngle,
          segmentIndex
        });
      }
      
    } catch (error) {
      console.warn('Error sampling SVG path:', error);
    } finally {
      document.body.removeChild(svg);
    }
    
    return samples;
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
  static createCachedSampler(pathData: string, sampleDistance: number = 2) {
    const samples = this.samplePath(pathData, sampleDistance);
    
    return {
      samples,
      getPointAtProgress: (progress: number) => this.getPointAtProgress(samples, progress),
      getTangentAtProgress: (progress: number) => this.getTangentAtProgress(samples, progress),
      getTotalLength: () => samples.length > 0 ? samples[samples.length - 1].cumulativeLength : 0
    };
  }
}
