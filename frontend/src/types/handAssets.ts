// Enhanced Hand Asset Model for Three-Layer Rendering

export interface Point2D {
  x: number;
  y: number;
}

export interface Size2D {
  w: number;
  h: number;
}

export interface HandAsset {
  id: string;
  name: string;
  description?: string;
  
  // Two-layer hand rendering
  imageBg: string;  // Palm + lower fingers (behind tool)
  imageFg: string;  // Top fingers/thumb (in front of tool)
  sizePx: Size2D;
  
  // Grip anchors (in hand image coordinate system)
  gripBase: Point2D;      // Where tool sits in palm
  gripForward: Point2D;   // Direction hand holds tool (defines vector)
  
  // Optional properties
  naturalTiltDeg?: number;  // Pose-specific rotation bias
  mirrorable?: boolean;     // Allow auto left/right by x-flip
}

export interface ToolAsset {
  id: string;
  name: string;
  description?: string;
  
  // Single layer tool
  image: string;
  sizePx: Size2D;
  
  // Tool anchors (in tool image coordinate system)
  socketBase: Point2D;     // Where hand grips the tool
  socketForward: Point2D;  // Along tool's axis (toward nib)
  tipAnchor: Point2D;      // The nib/marker tip point
  
  // Optional properties
  lengthMm?: number;           // Real-world scale hint
  rotationOffsetDeg?: number;  // If sprite drawn off-axis
}

export interface HandToolComposition {
  handAsset: HandAsset;
  toolAsset: ToolAsset;
  
  // Computed transform properties
  handPosition: Point2D;
  handRotation: number;
  handScale: number;
  
  toolPosition: Point2D;
  toolRotation: number;
  toolScale: number;
  
  // Final tip position in canvas coordinates
  finalTipPosition: Point2D;
}

// Helper function to build backend asset URLs dynamically
const getBackendAssetUrl = (filename: string) => {
  // This will be resolved at runtime by the component
  return `BACKEND_BASE/api/assets/${filename}`;
};

// Predefined hand assets using real backend images
export const HAND_ASSETS: HandAsset[] = [
  {
    id: "demo_hand_right",
    name: "Right Hand (Demo)",
    description: "Real hand from backend assets",
    imageBg: getBackendAssetUrl("hand_bg.png"),
    imageFg: getBackendAssetUrl("hand_fg.png"),
    sizePx: { w: 1024, h: 1024 }, // Actual image size
    gripBase: { x: Math.round(1024 * 0.46), y: Math.round(1024 * 0.55) }, // Same as Run Direct Demo
    gripForward: { x: Math.round(1024 * 0.66), y: Math.round(1024 * 0.56) }, // Same as Run Direct Demo
    naturalTiltDeg: -5,
    mirrorable: true
  },
  {
    id: "demo_hand_left", 
    name: "Left Hand (Demo)",
    description: "Real hand mirrored for left use",
    imageBg: getBackendAssetUrl("hand_bg.png"),
    imageFg: getBackendAssetUrl("hand_fg.png"),
    sizePx: { w: 1024, h: 1024 }, // Actual image size
    gripBase: { x: Math.round(1024 * 0.54), y: Math.round(1024 * 0.55) }, // Mirrored X: 1-0.46=0.54
    gripForward: { x: Math.round(1024 * 0.34), y: Math.round(1024 * 0.56) }, // Mirrored X: 1-0.66=0.34
    naturalTiltDeg: 5,
    mirrorable: true
  }
];

// Predefined tool assets using real backend images
export const TOOL_ASSETS: ToolAsset[] = [
  {
    id: "demo_tool_pen",
    name: "Pen/Tool (Demo)", 
    description: "Real tool from backend assets",
    image: getBackendAssetUrl("tool.png"),
    sizePx: { w: 1024, h: 1024 }, // Actual image size
    socketBase: { x: Math.round(1024 * 0.62), y: Math.round(1024 * 0.50) }, // Same as Run Direct Demo
    socketForward: { x: Math.round(1024 * 0.94), y: Math.round(1024 * 0.50) }, // Same as Run Direct Demo
    tipAnchor: { x: Math.round(1024 * 0.10), y: Math.round(1024 * 0.66) }, // Same as Run Direct Demo
    rotationOffsetDeg: 0,
    lengthMm: 150
  }
];

// Hand-Tool compatibility matrix (some combinations work better than others)
export const HAND_TOOL_COMPATIBILITY: Record<string, string[]> = {
  "demo_hand_right": ["demo_tool_pen"],
  "demo_hand_left": ["demo_tool_pen"]
};
