# Hand Follower System Implementation Plan

## Overview
This document outlines the implementation of a Hand Follower System for Scribe Animator that creates realistic hand-drawn animations by showing a hand with a pencil following SVG path strokes in real-time.

## Problem Statement
Current SVG path animations use stroke-dash offset which creates a "magical appearance" effect. Users expect to see a realistic hand + pencil tool following the stroke tip to create the illusion of human drawing, similar to tools like Doodly/VideoScribe but with support for any SVG path.

## Success Criteria
- Hand follows any SVG path with pen tip aligned to current drawing position
- Natural rotation following path tangent direction
- Human-like movement with smoothing and corner lifts
- Configurable through properties panel
- Performance: 60 FPS with multiple hands active
- Works with imported images, traced SVGs, and custom drawings

---

## Phase 1: Core Foundation (Week 1)

### 1.1 SVG Path Sampling System
**File:** `frontend/src/utils/pathSampler.ts`

```typescript
interface PathPoint {
  x: number;
  y: number;
  cumulativeLength: number;
  tangentAngle: number; // in radians
  segmentIndex: number;
}

class PathSampler {
  static samplePath(pathData: string, sampleDistance: number = 2): PathPoint[]
  static getPointAtProgress(samples: PathPoint[], progress: number): PathPoint
  static getTangentAtProgress(samples: PathPoint[], progress: number): number
}
```

**Tasks:**
- [ ] Create path sampling utility using SVG `getPointAtLength()` and `getTotalLength()`
- [ ] Break SVG paths into small segments (2px intervals)
- [ ] Calculate cumulative length and tangent angles
- [ ] Add unit tests for basic shapes (line, circle, complex curve)

### 1.2 Hand Asset Management
**File:** `frontend/src/components/hands/HandAssetManager.ts`

```typescript
interface HandAsset {
  id: string;
  name: string;
  svgData: string;
  tipAnchor: { x: number; y: number }; // pen tip position in SVG coordinates
  rotationOffset: number; // degrees to align with path
  scale: number;
}

class HandAssetManager {
  static loadHandAsset(assetId: string): Promise<HandAsset>
  static getAvailableHands(): HandAsset[]
  static calibrateTipAnchor(asset: HandAsset, newAnchor: Point): HandAsset
}
```

**Tasks:**
- [ ] Create hand asset structure
- [ ] Load existing hand SVG assets (user mentioned they have these)
- [ ] Define pen tip anchor points for each hand
- [ ] Create hand asset registry

### 1.3 Hand Follower Component
**File:** `frontend/src/components/canvas/HandFollower.tsx`

```typescript
interface HandFollowerProps {
  pathData: string;
  progress: number; // 0 to 1
  handAsset: HandAsset;
  visible: boolean;
  scale?: number;
  smoothing?: number;
}

const HandFollower: React.FC<HandFollowerProps>
```

**Tasks:**
- [ ] Create Konva-based hand component
- [ ] Position hand tip at current path point
- [ ] Rotate hand based on path tangent
- [ ] Add to canvas layers above stroke content
- [ ] Sync with animation timeline

### 1.4 Integration with SVG Path Renderer
**File:** `frontend/src/components/canvas/renderers/SvgPathRenderer.tsx`

**Tasks:**
- [ ] Add hand follower option to SVG path objects
- [ ] Pass current animation progress to hand follower
- [ ] Ensure hand updates in sync with stroke drawing
- [ ] Add hand layer management

---

## Phase 2: Natural Movement (Week 2)

### 2.1 Movement Smoothing
**File:** `frontend/src/utils/motionSmoothing.ts`

```typescript
interface SmoothingConfig {
  enabled: boolean;
  strength: number; // 0-1, how much smoothing
  lookAhead: number; // samples to look ahead for direction
}

class MotionSmoother {
  static smoothPosition(currentPos: Point, targetPos: Point, config: SmoothingConfig): Point
  static smoothRotation(currentAngle: number, targetAngle: number, strength: number): number
  static addHumanJitter(position: Point, intensity: number): Point
}
```

**Tasks:**
- [ ] Implement position interpolation (easing/spring)
- [ ] Add rotation smoothing to prevent jerky turns
- [ ] Optional: Add subtle jitter for human-like movement
- [ ] Performance test smoothing algorithms

### 2.2 Corner Detection & Lifts
**File:** `frontend/src/utils/cornerDetection.ts`

```typescript
interface CornerLift {
  enabled: boolean;
  angleThreshold: number; // degrees
  liftDuration: number; // milliseconds
  liftHeight: number; // pixels
}

class CornerDetector {
  static detectSharpCorners(samples: PathPoint[], threshold: number): number[]
  static shouldLiftHand(currentAngle: number, nextAngle: number, threshold: number): boolean
  static createLiftAnimation(fromPoint: Point, toPoint: Point, config: CornerLift): Animation
}
```

**Tasks:**
- [ ] Detect sharp angle changes in path
- [ ] Implement hand lift/place animation
- [ ] Add timing delays between path segments
- [ ] Test with complex shapes (stars, zigzags)

### 2.3 Timeline Integration
**File:** `frontend/src/components/canvas/HandFollower.tsx` (enhancement)

**Tasks:**
- [ ] Support reverse/scrub playback
- [ ] Handle pause/resume states
- [ ] Maintain hand position during timeline jumps
- [ ] Sync multiple hands if multiple paths animate

---

## Phase 3: Configuration & Assets (Week 3)

### 3.1 Properties Panel Integration
**File:** `frontend/src/components/PropertiesPanel.tsx` (enhancement)

```typescript
interface HandFollowerSettings {
  enabled: boolean;
  handAssetId: string;
  scale: number;
  tipOffset: { x: number; y: number };
  smoothing: SmoothingConfig;
  cornerLifts: CornerLift;
  zIndex: number; // above/below stroke
}
```

**UI Controls:**
- [ ] Show/Hide hand toggle
- [ ] Hand style selector (dropdown)
- [ ] Scale slider (0.5x - 2x)
- [ ] Tip offset fine-tuning (x/y inputs)
- [ ] Smoothing strength slider
- [ ] Corner lift sensitivity
- [ ] Z-index control (hand above/below stroke)

### 3.2 Hand Asset Library
**File:** `frontend/src/components/hands/HandAssetLibrary.tsx`

**Hand Variants:**
- [ ] Right hand with pencil
- [ ] Left hand with pencil
- [ ] Hand with marker
- [ ] Hand with chalk
- [ ] Hand with pen
- [ ] Different skin tones

**Tasks:**
- [ ] Create asset management UI
- [ ] Asset preview in properties panel
- [ ] Custom asset upload support
- [ ] Asset validation (ensure tip anchor exists)

### 3.3 Calibration Tool
**File:** `frontend/src/components/hands/CalibrationTool.tsx`

**Features:**
- [ ] Visual tip alignment preview
- [ ] Click-to-adjust tip anchor
- [ ] Test path for calibration (simple line)
- [ ] Save calibration per hand asset
- [ ] Reset to defaults

---

## Phase 4: Persistence & Performance (Week 4)

### 4.1 Data Persistence
**File:** `frontend/src/store/appStore.ts` (enhancement)

```typescript
interface SceneObject {
  // ... existing properties
  handFollower?: HandFollowerSettings;
}
```

**Tasks:**
- [ ] Save hand settings in project JSON
- [ ] Load and restore hand configuration
- [ ] Migration for existing projects
- [ ] Export/import hand presets

### 4.2 Performance Optimization
**File:** `frontend/src/utils/performanceOptimizations.ts`

**Optimizations:**
- [ ] Precompute path samples once per object
- [ ] Use RequestAnimationFrame batching
- [ ] Lazy load hand assets
- [ ] Canvas layer optimization
- [ ] Memory management for unused hands

**Performance Targets:**
- [ ] 60 FPS with 5+ active hands
- [ ] <100ms initial hand setup
- [ ] <50MB memory usage per hand
- [ ] Smooth playback on mobile devices

### 4.3 Testing & Quality Assurance

**Unit Tests:**
- [ ] Path sampling accuracy (straight lines, curves, arcs)
- [ ] Progress-to-position mapping
- [ ] Tangent angle calculation
- [ ] Corner detection algorithm

**Integration Tests:**
- [ ] Hand follows simple shapes correctly
- [ ] Timeline scrubbing works smoothly
- [ ] Multiple hands don't interfere
- [ ] Settings persist across sessions

**Visual QA Tests:**
- [ ] Hand tip stays aligned during drawing
- [ ] Rotation looks natural on curves
- [ ] Corner lifts feel realistic
- [ ] No visual glitches during scrub/reverse

---

## Implementation Notes

### Existing Codebase Integration
- **SVG Path Objects**: Already exist in `SceneObject` type
- **Animation System**: Hooks into existing animation timeline
- **Canvas Layers**: Use existing Konva layer structure
- **Properties Panel**: Extend current properties system

### Technical Considerations
- **Coordinate Systems**: Convert between SVG viewBox and canvas coordinates
- **Performance**: Use `useMemo` for path sampling, `useCallback` for handlers
- **Mobile Support**: Touch-friendly calibration tools
- **Accessibility**: Keyboard navigation for settings

### File Organization
```
frontend/src/
├── components/hands/
│   ├── HandAssetManager.ts
│   ├── HandAssetLibrary.tsx
│   ├── CalibrationTool.tsx
│   └── HandFollower.tsx
├── utils/
│   ├── pathSampler.ts
│   ├── motionSmoothing.ts
│   ├── cornerDetection.ts
│   └── performanceOptimizations.ts
└── assets/hands/
    ├── right-hand-pencil.svg
    ├── left-hand-pencil.svg
    └── hand-marker.svg
```

### Dependencies
- **Existing**: Konva.js, React, TypeScript
- **New**: None required (pure SVG/Canvas implementation)

---

## Success Metrics
1. **User Experience**: Hand appears to naturally draw any SVG path
2. **Performance**: 60 FPS with multiple hands active
3. **Flexibility**: Works with imported images, custom drawings, and traced SVGs
4. **Usability**: Easy configuration through properties panel
5. **Quality**: Smooth motion during timeline scrubbing and reverse playback

## Next Steps
1. Start with Phase 1: Core Foundation
2. Create `pathSampler.ts` utility with basic SVG path sampling
3. Set up hand asset structure and load existing hand SVGs
4. Build basic hand follower component and integrate with SVG path renderer
5. Test with simple shapes before moving to Phase 2

This implementation will give Scribe Animator a significant competitive advantage by providing realistic hand-drawn animations that work with any SVG content.
