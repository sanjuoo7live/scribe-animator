/**
 * Type definitions for Hand Follower System
 */

import { HandAsset } from '../components/hands/HandAssetManager';

export interface HandFollowerSettings {
  enabled: boolean;
  handAsset?: HandAsset | null;
  scale?: number;
  offset?: { x: number; y: number };
  visible?: boolean;
  // Path-follow policy removed; hand always follows the currently drawing path
  
  // Phase 2: Natural Movement Settings
  smoothing?: {
    enabled: boolean;
    strength: number; // 0-1
    lookAhead: number; // samples to look ahead
    jitterIntensity?: number; // 0-1, subtle human-like movement
  };
  cornerLifts?: {
    enabled: boolean;
    angleThreshold: number; // degrees
    liftDuration: number; // milliseconds
    liftHeight: number; // pixels
    anticipation: number; // samples before corner to start lift
    settle: number; // samples after corner to complete placement
  };
  
  zIndex?: number; // layer ordering (above/below stroke)
}

// Extend the existing SceneObject properties to include hand follower
export interface HandFollowerSceneObjectProperties {
  handFollower?: HandFollowerSettings;
  // ... other existing properties
}

// Configuration presets for different use cases
export interface HandFollowerPreset {
  id: string;
  name: string;
  description: string;
  settings: HandFollowerSettings;
}

export const DEFAULT_HAND_FOLLOWER_PRESETS: HandFollowerPreset[] = [
  {
    id: 'realistic-drawing',
    name: 'Realistic Drawing',
    description: 'Natural hand movement with corner lifts and smoothing',
    settings: {
      enabled: true,
      scale: 1.0,
      offset: { x: 0, y: 0 },
      visible: true,
      smoothing: {
        enabled: true,
        strength: 0.3,
        lookAhead: 5
      },
      cornerLifts: {
        enabled: true,
        angleThreshold: 45,
        liftDuration: 200,
        liftHeight: 10,
        anticipation: 2,
        settle: 2
      },
      zIndex: 1000
    }
  },
  {
    id: 'simple-follow',
    name: 'Simple Follow',
    description: 'Basic hand following without smoothing',
    settings: {
      enabled: true,
      scale: 1.0,
      offset: { x: 0, y: 0 },
      visible: true,
      smoothing: {
        enabled: false,
        strength: 0,
        lookAhead: 0
      },
      cornerLifts: {
        enabled: false,
        angleThreshold: 90,
        liftDuration: 0,
        liftHeight: 0,
        anticipation: 0,
        settle: 0
      },
      zIndex: 1000
    }
  },
  {
    id: 'tool-only',
    name: 'Tool Only',
    description: 'Just the drawing tool without hand',
    settings: {
      enabled: true,
      scale: 0.8,
      offset: { x: 0, y: 0 },
      visible: true,
      smoothing: {
        enabled: false,
        strength: 0,
        lookAhead: 0
      },
      cornerLifts: {
        enabled: false,
        angleThreshold: 90,
        liftDuration: 0,
        liftHeight: 0,
        anticipation: 0,
        settle: 0
      },
      zIndex: 1000
    }
  }
];

// Helper function to get default hand follower settings
export const getDefaultHandFollowerSettings = (): HandFollowerSettings => {
  return {
    enabled: false, // Disabled by default to maintain backward compatibility
    scale: 1.0,
    offset: { x: 0, y: 0 },
    visible: true,
    smoothing: {
      enabled: false,
      strength: 0.2,
      lookAhead: 3
    },
    cornerLifts: {
      enabled: false,
      angleThreshold: 45,
      liftDuration: 150,
      liftHeight: 8,
      anticipation: 2,
      settle: 2
    },
    zIndex: 1000
  };
};
