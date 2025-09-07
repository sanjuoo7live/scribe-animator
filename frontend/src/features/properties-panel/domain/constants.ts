export interface RangeConfig {
  min: number;
  max?: number;
  step?: number;
  default: number;
  unit?: string;
}

/**
 * Centralized numeric ranges, steps, and defaults for properties panel controls.
 * These values document the current limits without altering behavior.
 */
export const PROPERTY_RANGES: Record<string, RangeConfig> = {
  strokeWidth: { min: 0, max: 20, step: 1, default: 2, unit: 'px' },
  fontSize: { min: 8, max: 72, step: 1, default: 16, unit: 'px' },
  animationStart: { min: 0, step: 0.1, default: 0, unit: 's' },
  animationDuration: { min: 0.1, step: 0.1, default: 5, unit: 's' },
  handScale: { min: 0.5, max: 2, step: 0.1, default: 1 },
  smoothingStrength: { min: 0.05, max: 0.5, step: 0.05, default: 0.15 },
  jitterIntensity: { min: 0, max: 0.1, step: 0.01, default: 0.02 },
  cornerLiftAngle: { min: 15, max: 60, step: 5, default: 30, unit: 'deg' },
  cornerLiftHeight: { min: 4, max: 20, step: 2, default: 8, unit: 'px' },
  cornerLiftDuration: { min: 100, max: 300, step: 25, default: 150, unit: 'ms' },
};

export default PROPERTY_RANGES;
