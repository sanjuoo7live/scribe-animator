/**
 * Corner Detection & Hand Lift System
 * Detects sharp turns in SVG paths and creates natural hand lift animations
 */

import { PathPoint } from '../../../../../utils/pathSampler';

export interface CornerLift {
  enabled: boolean;
  angleThreshold: number; // degrees - angle change that triggers a lift
  liftDuration: number; // milliseconds - how long the lift animation takes
  liftHeight: number; // pixels - how high to lift the hand
  anticipation: number; // samples before corner to start lift
  settle: number; // samples after corner to complete placement
}

export interface LiftAnimation {
  startTime: number;
  duration: number;
  startPos: { x: number; y: number; z: number };
  endPos: { x: number; y: number; z: number };
  peakHeight: number;
  isActive: boolean;
  progress: number; // 0-1
}

export interface CornerInfo {
  sampleIndex: number;
  angleChange: number; // in radians
  sharpness: number; // 0-1, how sharp the corner is
  needsLift: boolean;
}

export class CornerDetector {
  private static defaultConfig: CornerLift = {
    enabled: true,
    angleThreshold: 30, // degrees
    liftDuration: 150, // ms
    liftHeight: 8, // pixels
    anticipation: 2,
    settle: 2
  };

  /**
   * Detect sharp corners in a path that might need hand lifts
   */
  static detectSharpCorners(
    samples: PathPoint[], 
    config: CornerLift = this.defaultConfig
  ): CornerInfo[] {
    if (!samples || samples.length < 3) return [];

    const corners: CornerInfo[] = [];
    const thresholdRad = (config.angleThreshold * Math.PI) / 180;

    for (let i = 1; i < samples.length - 1; i++) {
      const prev = samples[i - 1];
      const current = samples[i];
      const next = samples[i + 1];

      if (!prev || !current || !next) continue;

      // Calculate angle change at this point
      const angleChange = this.calculateAngleChange(
        prev.tangentAngle,
        current.tangentAngle,
        next.tangentAngle
      );

      const sharpness = Math.abs(angleChange) / Math.PI; // 0-1 scale

      if (Math.abs(angleChange) > thresholdRad) {
        corners.push({
          sampleIndex: i,
          angleChange,
          sharpness,
          needsLift: config.enabled
        });
      }
    }

    return corners;
  }

  /**
   * Calculate the angle change at a point considering smoothing
   */
  private static calculateAngleChange(
    prevAngle: number,
    currentAngle: number,
    nextAngle: number
  ): number {
    // Normalize angles to handle wraparound
    const normalizeAngle = (angle: number) => {
      while (angle > Math.PI) angle -= 2 * Math.PI;
      while (angle < -Math.PI) angle += 2 * Math.PI;
      return angle;
    };

    const a1 = normalizeAngle(currentAngle - prevAngle);
    const a2 = normalizeAngle(nextAngle - currentAngle);

    // Return the total angular change
    return normalizeAngle(a2 - a1);
  }

  /**
   * Determine if hand should lift at current position
   */
  static shouldLiftHand(
    currentSampleIndex: number,
    corners: CornerInfo[],
    config: CornerLift = this.defaultConfig
  ): CornerInfo | null {
    if (!config.enabled || !corners.length) return null;

    // Check if we're approaching a corner
    for (const corner of corners) {
      const distanceToCorner = corner.sampleIndex - currentSampleIndex;
      
      // Start lift slightly before the corner
      if (distanceToCorner >= 0 && distanceToCorner <= config.anticipation) {
        return corner;
      }
    }

    return null;
  }

  /**
   * Create hand lift animation between two points
   */
  static createLiftAnimation(
    fromPoint: { x: number; y: number },
    toPoint: { x: number; y: number },
    config: CornerLift = this.defaultConfig
  ): LiftAnimation {
    return {
      startTime: performance.now(),
      duration: config.liftDuration,
      startPos: { ...fromPoint, z: 0 },
      endPos: { ...toPoint, z: 0 },
      peakHeight: config.liftHeight,
      isActive: true,
      progress: 0
    };
  }

  /**
   * Update lift animation and get current position
   */
  static updateLiftAnimation(animation: LiftAnimation): { x: number; y: number; z: number } {
    if (!animation.isActive) {
      return animation.endPos;
    }

    const elapsed = performance.now() - animation.startTime;
    animation.progress = Math.min(elapsed / animation.duration, 1);

    if (animation.progress >= 1) {
      animation.isActive = false;
      return animation.endPos;
    }

    // Use easing for natural movement
    const easeProgress = this.easeInOutCubic(animation.progress);

    // Calculate position along arc
    const x = this.lerp(animation.startPos.x, animation.endPos.x, easeProgress);
    const y = this.lerp(animation.startPos.y, animation.endPos.y, easeProgress);

    // Calculate lift height using parabolic arc
    const liftProgress = Math.sin(animation.progress * Math.PI); // 0 -> 1 -> 0
    const z = liftProgress * animation.peakHeight;

    return { x, y, z };
  }

  /**
   * Check if hand should be lifted at specific path progress
   */
  static getHandLiftState(
    pathProgress: number, // 0-1
    samples: PathPoint[],
    corners: CornerInfo[],
    config: CornerLift = this.defaultConfig
  ): { shouldLift: boolean; liftHeight: number; corner?: CornerInfo } {
    if (!config.enabled || !corners.length || !samples.length) {
      return { shouldLift: false, liftHeight: 0 };
    }

    const currentSampleIndex = Math.floor(pathProgress * (samples.length - 1));
    
    for (const corner of corners) {
      const distanceToCorner = Math.abs(corner.sampleIndex - currentSampleIndex);
      const maxDistance = config.anticipation + config.settle;

      if (distanceToCorner <= maxDistance) {
        // Calculate lift height based on distance to corner and sharpness
        const distanceFactor = 1 - (distanceToCorner / maxDistance);
        const liftHeight = config.liftHeight * corner.sharpness * distanceFactor;

        return {
          shouldLift: true,
          liftHeight,
          corner
        };
      }
    }

    return { shouldLift: false, liftHeight: 0 };
  }

  /**
   * Analyze path complexity for automatic corner detection tuning
   */
  static analyzePathComplexity(samples: PathPoint[]): {
    totalCorners: number;
    averageSharpness: number;
    maxAngleChange: number;
    recommended: Partial<CornerLift>;
  } {
    const corners = this.detectSharpCorners(samples);
    
    if (corners.length === 0) {
      return {
        totalCorners: 0,
        averageSharpness: 0,
        maxAngleChange: 0,
        recommended: { enabled: false }
      };
    }

    const totalSharpness = corners.reduce((sum, c) => sum + c.sharpness, 0);
    const maxAngleChange = Math.max(...corners.map(c => Math.abs(c.angleChange)));
    const averageSharpness = totalSharpness / corners.length;

    // Recommend settings based on complexity
    const recommended: Partial<CornerLift> = {
      enabled: true,
      angleThreshold: maxAngleChange > 1.5 ? 45 : 30, // More sensitive for smoother paths
      liftHeight: averageSharpness > 0.7 ? 12 : 8, // Higher lifts for sharper corners
      liftDuration: corners.length > 5 ? 120 : 150 // Faster for many corners
    };

    return {
      totalCorners: corners.length,
      averageSharpness,
      maxAngleChange: (maxAngleChange * 180) / Math.PI, // Convert to degrees
      recommended
    };
  }

  /**
   * Smooth corner transitions to reduce jarring movements
   */
  static smoothCornerTransition(
    currentAngle: number,
    targetAngle: number,
    cornerSharpness: number
  ): number {
    // More smoothing for sharper corners
    const smoothingFactor = 0.1 + (cornerSharpness * 0.2);
    
    let angleDiff = targetAngle - currentAngle;
    
    // Handle angle wraparound
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    return currentAngle + (angleDiff * smoothingFactor);
  }

  // Utility functions
  private static easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}

// Corner detection presets
export const CornerPresets = {
  off: { 
    enabled: false, 
    angleThreshold: 0, 
    liftDuration: 0, 
    liftHeight: 0, 
    anticipation: 0, 
    settle: 0 
  },
  subtle: { 
    enabled: true, 
    angleThreshold: 45, 
    liftDuration: 100, 
    liftHeight: 4, 
    anticipation: 1, 
    settle: 1 
  },
  normal: { 
    enabled: true, 
    angleThreshold: 30, 
    liftDuration: 150, 
    liftHeight: 8, 
    anticipation: 2, 
    settle: 2 
  },
  pronounced: { 
    enabled: true, 
    angleThreshold: 20, 
    liftDuration: 200, 
    liftHeight: 12, 
    anticipation: 3, 
    settle: 3 
  },
  artistic: { 
    enabled: true, 
    angleThreshold: 15, 
    liftDuration: 250, 
    liftHeight: 16, 
    anticipation: 4, 
    settle: 4 
  }
} as const;

export type CornerPresetName = keyof typeof CornerPresets;
