export const FEATURE_FLAGS = {
  handSmoothing: false,
  cornerLifts: false,
  uploads: false,
  calibrators: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
