export const FEATURE_FLAGS = {
  handSmoothing: true,
  cornerLifts: true,
  uploads: false,
  calibrators: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
