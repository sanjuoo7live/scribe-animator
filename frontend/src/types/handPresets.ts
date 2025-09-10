/**
 * Hand Asset Preset Schema
 * Phase 1: Minimal preset schema for dedicated hand asset management
 */

export interface HandPresetImages {
  bg: string;
  tool: string;
  fg: string;
  thumbnail: string;
}

export interface HandPresetDimensions {
  width: number;
  height: number;
}

export interface HandPresetAnchors {
  wrist: { x: number; y: number };
  grip: { x: number; y: number };
}

export interface HandPresetTool {
  type: 'pencil' | 'pen' | 'marker' | 'chalk' | 'stylus';
  tip: { x: number; y: number };
  tipNormal: number;
  nibOffset: { dx: number; dy: number };
  lengthPx?: number;
  pressureToWidth?: { min: number; max: number };
}

export interface HandPresetRender {
  zOrder: ('bg' | 'tool' | 'fg')[];
  scale: number;
  maxScale: number;
  shadow?: { enabled: boolean; opacity: number };
}

export interface HandPresetCompat {
  minAppVersion: string;
}

export interface HandPreset {
  schemaVersion: number;
  id: string;
  title: string;
  handedness: 'left' | 'right';
  style: 'photoreal' | 'cartoon' | 'sketch';
  skinTone: 'light' | 'medium' | 'dark';
  
  images: HandPresetImages;
  dimensions: HandPresetDimensions;
  anchors: HandPresetAnchors;
  tool: HandPresetTool;
  render: HandPresetRender;
  compat: HandPresetCompat;
  
  author?: string;
  license?: string;
}

export interface HandPresetManifestEntry {
  id: string;
  path: string;
}

export interface HandPresetManifest {
  schemaVersion: number;
  sets: HandPresetManifestEntry[];
}

// ————————————————————————————————————————————————————————————————
// Optional: Independent Tool Presets (Phase 2)
// Keeps backward compatibility with Phase 1 hand-bound tools.

export interface ToolPresetImages {
  image: string;
  thumbnail: string;
}

export interface ToolPresetDimensions {
  width: number;
  height: number;
}

export interface ToolPresetAnchors {
  // Where the hand grips this tool (origin for socket)
  socketBase: { x: number; y: number };
  // Forward along the tool from the socket (defines orientation)
  socketForward: { x: number; y: number };
  // Ink tip anchor in the tool image
  tip: { x: number; y: number };
}

export interface ToolPresetRender {
  rotationOffsetDeg?: number; // if sprite is drawn off-axis
}

export interface ToolPresetCompat { minAppVersion: string }

export interface ToolPreset {
  schemaVersion: number;
  id: string;
  title: string;
  type: 'pencil' | 'pen' | 'marker' | 'chalk' | 'stylus';
  images: ToolPresetImages;
  dimensions: ToolPresetDimensions;
  anchors: ToolPresetAnchors;
  render?: ToolPresetRender;
  compat?: ToolPresetCompat;
  author?: string;
  license?: string;
}

export interface ToolPresetManifestEntry { id: string; path: string }
export interface ToolPresetManifest {
  schemaVersion: number;
  sets: ToolPresetManifestEntry[];
}
