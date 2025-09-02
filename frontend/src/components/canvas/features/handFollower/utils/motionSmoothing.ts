/**
 * Motion Smoothing System for Hand Follower
 * Provides natural, human-like movement by smoothing position and rotation transitions
 */

export interface SmoothingConfig {
  enabled: boolean;
  strength: number; // 0-1, how much smoothing to apply
  lookAhead: number; // samples to look ahead for direction prediction
  jitterIntensity?: number; // 0-1, subtle human-like movement variation
}

export interface Point {
  x: number;
  y: number;
}

export interface SmoothingState {
  lastPosition: Point;
  lastAngle: number;
  velocity: Point;
  angularVelocity: number;
  lastUpdateTime: number;
}

export class MotionSmoother {
  private static defaultConfig: SmoothingConfig = {
    enabled: true,
    strength: 0.15, // Light smoothing by default
    lookAhead: 3,
    jitterIntensity: 0.02
  };

  /**
   * Smooth position transition using spring-like interpolation
   */
  static smoothPosition(
    currentPos: Point, 
    targetPos: Point, 
    state: SmoothingState,
    config: SmoothingConfig = this.defaultConfig
  ): Point {
    if (!config.enabled) {
      return targetPos;
    }

    const deltaTime = Math.min(performance.now() - state.lastUpdateTime, 16.67); // Cap at 60fps
    const damping = 1 - Math.pow(config.strength, deltaTime / 16.67);

    // Calculate smooth interpolation
    const smoothX = currentPos.x + (targetPos.x - currentPos.x) * damping;
    const smoothY = currentPos.y + (targetPos.y - currentPos.y) * damping;

    // Update velocity for momentum tracking
    state.velocity = {
      x: (smoothX - state.lastPosition.x) / deltaTime,
      y: (smoothY - state.lastPosition.y) / deltaTime
    };

    state.lastPosition = { x: smoothX, y: smoothY };
    state.lastUpdateTime = performance.now();

    return { x: smoothX, y: smoothY };
  }

  /**
   * Smooth rotation transitions to prevent jarring direction changes
   */
  static smoothRotation(
    currentAngle: number, 
    targetAngle: number, 
    state: SmoothingState,
    strength: number = 0.2
  ): number {
    // Normalize angles to handle wraparound (-π to π)
    const normalizeAngle = (angle: number) => {
      while (angle > Math.PI) angle -= 2 * Math.PI;
      while (angle < -Math.PI) angle += 2 * Math.PI;
      return angle;
    };

    const currentNorm = normalizeAngle(currentAngle);
    const targetNorm = normalizeAngle(targetAngle);
    
    // Find shortest rotation direction
    let angleDiff = targetNorm - currentNorm;
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const deltaTime = Math.min(performance.now() - state.lastUpdateTime, 16.67);
    const damping = 1 - Math.pow(strength, deltaTime / 16.67);
    
    const smoothAngle = currentNorm + angleDiff * damping;
    
    // Update angular velocity
    state.angularVelocity = (smoothAngle - state.lastAngle) / deltaTime;
    state.lastAngle = smoothAngle;

    return normalizeAngle(smoothAngle);
  }

  /**
   * Add subtle human-like movement variation
   */
  static addHumanJitter(
    position: Point, 
    intensity: number = 0.02,
    timeScale: number = 1000
  ): Point {
    if (intensity <= 0) return position;

    const time = performance.now() / timeScale;
    
    // Use sine waves with different frequencies for natural variation
    const jitterX = Math.sin(time * 2.1) * Math.cos(time * 1.7) * intensity;
    const jitterY = Math.cos(time * 1.9) * Math.sin(time * 2.3) * intensity;

    return {
      x: position.x + jitterX,
      y: position.y + jitterY
    };
  }

  /**
   * Predict future direction for smoother corner handling
   */
  static predictDirection(
    samples: any[], // PathPoint array
    currentIndex: number,
    lookAhead: number = 3
  ): number {
    if (!samples || samples.length <= currentIndex + 1) {
      return samples[currentIndex]?.tangentAngle || 0;
    }

    const endIndex = Math.min(currentIndex + lookAhead, samples.length - 1);
    const startPoint = samples[currentIndex];
    const endPoint = samples[endIndex];

    if (!startPoint || !endPoint) {
      return samples[currentIndex]?.tangentAngle || 0;
    }

    // Calculate overall direction vector
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;

    return Math.atan2(dy, dx);
  }

  /**
   * Create a new smoothing state for tracking motion
   */
  static createSmoothingState(initialPos: Point = { x: 0, y: 0 }, initialAngle: number = 0): SmoothingState {
    return {
      lastPosition: { ...initialPos },
      lastAngle: initialAngle,
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      lastUpdateTime: performance.now()
    };
  }

  /**
   * Adaptive smoothing that adjusts based on movement speed
   */
  static adaptiveSmoothing(
    currentPos: Point,
    targetPos: Point,
    state: SmoothingState,
    baseConfig: SmoothingConfig
  ): Point {
    // Calculate movement speed
    const distance = Math.sqrt(
      Math.pow(targetPos.x - currentPos.x, 2) + 
      Math.pow(targetPos.y - currentPos.y, 2)
    );

    // Reduce smoothing for fast movements, increase for slow movements
    const speedFactor = Math.max(0.1, Math.min(1.0, distance / 10));
    const adaptiveStrength = baseConfig.strength * (1 / speedFactor);

    const adaptiveConfig: SmoothingConfig = {
      ...baseConfig,
      strength: Math.min(adaptiveStrength, 0.8) // Cap maximum smoothing
    };

    return this.smoothPosition(currentPos, targetPos, state, adaptiveConfig);
  }

  /**
   * Smooth the overall hand movement with momentum preservation
   */
  static smoothHandMovement(
    currentPos: Point,
    targetPos: Point,
    currentAngle: number,
    targetAngle: number,
    state: SmoothingState,
    config: SmoothingConfig
  ): { position: Point; angle: number } {
    // Apply position smoothing
    let smoothPos = this.smoothPosition(currentPos, targetPos, state, config);
    
    // Apply rotation smoothing
    const smoothAngle = this.smoothRotation(currentAngle, targetAngle, state, config.strength);
    
    // Add subtle human jitter if enabled
    if (config.jitterIntensity && config.jitterIntensity > 0) {
      smoothPos = this.addHumanJitter(smoothPos, config.jitterIntensity);
    }

    return {
      position: smoothPos,
      angle: smoothAngle
    };
  }
}

// Default smoothing presets
export const SmoothingPresets = {
  none: { enabled: false, strength: 0, lookAhead: 0 },
  light: { enabled: true, strength: 0.1, lookAhead: 2, jitterIntensity: 0.01 },
  medium: { enabled: true, strength: 0.15, lookAhead: 3, jitterIntensity: 0.02 },
  heavy: { enabled: true, strength: 0.3, lookAhead: 5, jitterIntensity: 0.03 },
  humanLike: { enabled: true, strength: 0.2, lookAhead: 4, jitterIntensity: 0.025 }
} as const;

export type SmoothingPresetName = keyof typeof SmoothingPresets;
