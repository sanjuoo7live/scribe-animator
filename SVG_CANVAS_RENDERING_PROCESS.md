# SVG Canvas Rendering Process Documentation

## Overview

Scribe Animator provides multiple pathways for rendering SVG content on canvas, each optimized for different use cases - from static display to animated drawing effects. This document outlines the complete SVG-to-canvas rendering pipeline.

## Table of Contents

1. [SVG Import Methods](#svg-import-methods)
2. [Path Data Processing](#path-data-processing)
3. [Rendering Systems](#rendering-systems)
4. [Animation Pipeline](#animation-pipeline)
5. [Technical Implementation](#technical-implementation)
6. [Canvas Integration](#canvas-integration)

---

## SVG Import Methods

### 1. Direct SVG Import
Users can import SVG files or paste SVG markup directly into the application through the **SvgImporter** component.

**Supported SVG Elements:**
- `<path>` - Direct path data import
- `<rect>` - Converted to path data
- `<circle>` - Converted to path data using circular segments
- `<ellipse>` - Converted to path data
- `<line>` - Converted to path data
- `<polyline>` - Converted to path data
- `<polygon>` - Converted to path data with closure
- `<g>` groups - Processed recursively

### 2. VTracer Vectorization
Images can be converted to SVG using the VTracer WASM module:

```javascript
// VTracer converts raster images to vector paths
const result = v.convert_image_to_svg(
  imageBytes,
  width,
  height,
  color_precision: 6,
  filter_speckle: 4,
  layer_difference: 16,
  corner_threshold: 60,
  length_threshold: 4.0,
  splice_threshold: 45,
  mode: 'spline',
  hierarchical: 'stacked'
);
```

**Example Generated SVG:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- Generator: visioncortex VTracer 0.6.4 -->
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="400" height="321">
  <path d="M0 0 C0.6 0.35 1.2 0.7 1.81 1.06 C4.11 2.33 4.11 2.33 7 1 C7.66 1.99 8.32 2.98 9 4..." />
</svg>
```

### 3. Hand-Drawn Path Import
Users can draw paths directly on images using the **ProDrawEditor**, which generates SVG path data from user strokes.

---

## Path Data Processing

### 1. SVG Parsing and Normalization

When an SVG is imported, the application:

1. **Parses the SVG DOM** using `DOMParser`
2. **Extracts viewBox information** or calculates from width/height
3. **Converts all shapes to path data** using coordinate transformations
4. **Applies transformation matrices** from parent groups

```typescript
// Transform coordinate transformation
type Mat = [number,number,number,number,number,number]; // 2D transformation matrix
const apply = (m: Mat, x: number, y: number): { x: number; y: number } => ({
  x: m[0] * x + m[2] * y + m[4],
  y: m[1] * x + m[3] * y + m[5]
});
```

### 2. Path Length Calculation

Each path's total length is measured for animation purposes:

```typescript
// Measures path length using browser's SVG API
const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
pathElement.setAttribute('d', pathData);
const totalLength = pathElement.getTotalLength();
```

### 3. Path Data Structure

Processed paths are stored as:

```typescript
interface ParsedPath {
  d: string;              // SVG path data
  stroke?: string;        // Stroke color
  strokeWidth?: number;   // Stroke width
  fill?: string;          // Fill color
  fillRule?: 'nonzero' | 'evenodd';
  m?: [number,number,number,number,number,number]; // Transformation matrix
  len?: number;           // Calculated path length
}
```

---

## Rendering Systems

### 1. Konva.js Canvas Rendering (Primary System)

The main application uses **Konva.js** for vector graphics rendering on HTML5 canvas.

**Architecture:**
- **Stage**: Root container for the entire canvas
- **Layer**: Contains all drawable objects
- **Shape**: Individual path elements using Konva's `Shape` component

```tsx
// SVG paths are rendered as Konva Shapes
<Shape
  sceneFunc={(context, shape) => {
    const path = new Path2D(pathData);
    context.stroke(path);
    if (fillColor) {
      context.fillStyle = fillColor;
      context.fill(path);
    }
  }}
  strokeWidth={strokeWidth}
  stroke={strokeColor}
/>
```

### 2. Native Canvas 2D Rendering (Preview System)

For preview and testing, a direct Canvas 2D API implementation is used:

```typescript
const renderCanvasProgress = (progress: number) => {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (const pathData of paths) {
    const path = new Path2D(pathData.d);
    ctx.lineWidth = pathData.strokeWidth || 2;
    ctx.strokeStyle = pathData.stroke || '#111827';
    ctx.stroke(path);
  }
};
```

### 3. Resvg WASM Rendering (High-Fidelity Reference)

For pixel-perfect SVG rendering, **Resvg WASM** is used:

```typescript
import { drawSvgOnCanvas } from '../utils/resvgCanvas';

// Renders SVG to ImageData then draws on canvas
await drawSvgOnCanvas(ctx, svgString, {
  fitTo: { mode: 'width', value: canvasWidth },
  background: '#ffffff00' // transparent
});
```

---

## Animation Pipeline

### 1. Draw-In Animation

The signature feature is **progressive path revelation** using stroke-dasharray:

```typescript
// Animation state calculation
const targetLength = progress * totalPathLength;
const pathStart = cumulativeLength;
const pathEnd = cumulativeLength + pathLength;

if (targetLength <= pathStart) {
  // Path not started - completely hidden
  dash = [pathLength, pathLength];
  dashOffset = pathLength;
} else if (targetLength >= pathEnd) {
  // Path fully revealed
  dash = undefined;
  dashOffset = 0;
} else {
  // Path partially revealed
  const localReveal = targetLength - pathStart;
  dash = [localReveal, pathLength];
  dashOffset = 0;
}
```

### 2. Fill Strategies

Three fill strategies are supported:

1. **After All**: Fill only when all paths are drawn
2. **Per Path**: Fill each path immediately after it's drawn
3. **Batched**: Fill paths in batches during drawing

```typescript
const fillKind: 'afterAll' | 'perPath' | 'batched' = drawOptions?.fillStrategy?.kind || 'afterAll';

// Batched fill logic
if (fillKind === 'batched') {
  const batchThreshold = (progress * batchesN) / batchesN * totalLength;
  fillColor = pathEnd <= batchThreshold ? pathFill : 'transparent';
}
```

### 3. Hand Follower Integration

Animated hand assets follow the drawing progress:

```typescript
// Calculate active path and local progress
let activePath = null;
let localProgress = 0;

for (const path of paths) {
  if (targetLength >= pathStart && targetLength < pathEnd) {
    activePath = path;
    localProgress = (targetLength - pathStart) / pathLength;
    break;
  }
}

// Sample path at current progress for hand positioning
const pathPoints = PathSampler.samplePath(activePath.d, 2);
const currentPoint = getPointAtProgress(pathPoints, localProgress);
```

---

## Technical Implementation

### 1. Path Sampling

The `PathSampler` class converts SVG paths to point arrays for animation:

```typescript
class PathSampler {
  static samplePath(pathData: string, sampleDistance: number = 2): PathPoint[] {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', pathData);
    
    const totalLength = path.getTotalLength();
    const numSamples = Math.ceil(totalLength / sampleDistance);
    
    const points = [];
    for (let i = 0; i <= numSamples; i++) {
      const distance = (i / numSamples) * totalLength;
      const point = path.getPointAtLength(distance);
      points.push({
        x: point.x,
        y: point.y,
        cumulativeLength: distance,
        tangentAngle: calculateTangentAngle(path, distance)
      });
    }
    return points;
  }
}
```

### 2. Coordinate Transformations

SVG coordinate systems are mapped to canvas space:

```typescript
// ViewBox to canvas mapping
const scaleX = canvasWidth / viewBoxWidth;
const scaleY = canvasHeight / viewBoxHeight;

// Apply transformation matrix
if (pathMatrix) {
  ctx.save();
  ctx.transform(
    pathMatrix[0], pathMatrix[1], 
    pathMatrix[2], pathMatrix[3], 
    pathMatrix[4], pathMatrix[5]
  );
}
```

### 3. High-DPI Support

Canvas rendering accounts for device pixel ratio:

```typescript
const dpr = window.devicePixelRatio || 1;
const pixelWidth = Math.round(displayWidth * dpr);
const pixelHeight = Math.round(displayHeight * dpr);

canvas.width = pixelWidth;
canvas.height = pixelHeight;
canvas.style.width = displayWidth + 'px';
canvas.style.height = displayHeight + 'px';

// Scale context to compensate
ctx.scale(dpr, dpr);
```

---

## Canvas Integration

### 1. Object Creation

When SVG is added to canvas, it becomes a `svgPath` object:

```typescript
const svgPathObject = {
  id: `draw-${mode}-${timestamp}`,
  type: 'svgPath',
  x: 150,
  y: 150,
  width: boundingBoxWidth,
  height: boundingBoxHeight,
  rotation: 0,
  properties: {
    paths: pathObjects,           // Array of processed paths
    totalLen: totalLength,        // Sum of all path lengths
    previewDraw: isPreviewMode,   // Preview vs production mode
    drawOptions: drawOptions,     // Animation settings
  },
  animationType: 'drawIn',
  animationStart: 0,
  animationDuration: durationSeconds,
  animationEasing: 'linear'
};
```

### 2. Renderer Pipeline

The `SvgPathRenderer` component handles rendering:

```tsx
export const SvgPathRenderer: React.FC<BaseRendererProps> = ({
  obj, animatedProps, currentTime, isSelected, tool, onClick, onDragEnd
}) => {
  // Calculate animation progress
  const progress = calculateAnimationProgress(
    currentTime,
    obj.animationStart || 0,
    obj.animationDuration || 5,
    obj.animationEasing || 'easeOut'
  );

  // Render each path with appropriate animation state
  return (
    <Group x={animatedProps.x} y={animatedProps.y}>
      {paths.map((path, index) => (
        <Shape
          key={index}
          sceneFunc={(context) => {
            const pathObj = new Path2D(path.d);
            
            // Apply stroke dash for animation
            if (isDraw && progress < 1) {
              context.setLineDash(dashArray);
              context.lineDashOffset = dashOffset;
            }
            
            context.stroke(pathObj);
            if (fillColor) {
              context.fillStyle = fillColor;
              context.fill(pathObj);
            }
          }}
        />
      ))}
    </Group>
  );
};
```

### 3. Performance Optimizations

**Path Caching:**
- Path2D objects are cached per path to avoid recreation
- Length calculations are memoized
- Transform matrices are pre-computed

**Rendering Optimizations:**
- Only visible paths are processed during animation
- Canvas updates use requestAnimationFrame
- Path complexity is limited during import

**Memory Management:**
- SVG DOM elements are cleaned up after processing
- WASM modules are loaded lazily
- Large path arrays are truncated to prevent memory issues

---

## Example Usage

### From SVG String to Animated Canvas

```typescript
// 1. Import SVG
const svgString = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="321">
  <path d="M0 0 C0.6 0.35 1.2 0.7 1.81 1.06..." />
</svg>`;

// 2. Parse and extract paths
const { paths, viewBox } = parseSvgString(svgString);

// 3. Calculate path lengths
const pathLengths = paths.map(path => measurePathLength(path.d));
const totalLength = pathLengths.reduce((sum, len) => sum + len, 0);

// 4. Create canvas object
const svgObject = {
  type: 'svgPath',
  properties: { paths, totalLen: totalLength },
  animationType: 'drawIn',
  animationDuration: 5.0
};

// 5. Render on Konva canvas
// The SvgPathRenderer automatically handles the progressive revelation
```

### From Raw Path Data

```typescript
// Direct path data can be used
const pathData = "M0 0 C0.6 0.35 1.2 0.7 1.81 1.06 C4.11 2.33...";

const pathObject = {
  d: pathData,
  stroke: '#000000',
  strokeWidth: 2,
  fill: 'transparent'
};

// Processed through the same pipeline
```

---

## File Structure

### Core Rendering Files

- **`SvgImporter.tsx`** - Main SVG import interface
- **`SvgPathRenderer.tsx`** - Konva-based SVG path renderer
- **`resvgCanvas.ts`** - Resvg WASM integration for high-fidelity rendering
- **`pathSampler.ts`** - Path sampling utilities for animation
- **`pathLength.ts`** - Path length measurement utilities

### Supporting Systems

- **`vtracerWorker.ts`** - Web Worker for VTracer WASM processing
- **`CanvasContext.tsx`** - Canvas context and Konva integration
- **`AnimationEngine.tsx`** - Frame-based animation system
- **`RendererRegistry.tsx`** - Object type to renderer mapping

---

## Rendering Pipeline Summary

1. **Import** → SVG file/markup or VTracer conversion
2. **Parse** → Extract path data and transform coordinates
3. **Process** → Calculate lengths, apply transformations
4. **Store** → Create canvas object with path properties
5. **Render** → Use appropriate renderer (Konva/Canvas2D/Resvg)
6. **Animate** → Progressive revelation using dash patterns
7. **Display** → Final composition with optional hand followers

This multi-layered approach ensures compatibility across different use cases while maintaining high performance and visual fidelity.

---

## Technical Notes

- **Browser Compatibility**: Uses native SVG APIs (getPointAtLength, getTotalLength)
- **Performance**: Paths are sampled and cached to optimize animation
- **Memory**: Large SVGs are automatically filtered to prevent memory issues
- **Accuracy**: Multiple rendering backends ensure pixel-perfect output
- **Extensibility**: Modular renderer system allows custom object types
