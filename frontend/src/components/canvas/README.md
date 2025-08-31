# Canvas Module Documentation

## Overview

The Canvas module provides a modular, extensible architecture for the Scribe Animator canvas editor. It has been refactored from a monolithic component into a well-structured system with clear separation of concerns.

## Architecture

### Core Components

#### 1. CanvasContext (`CanvasContext.tsx`)
Provides the core canvas context with access to:
- Konva Stage and Layer references
- Animation clock for frame-based animations
- Overlay root for DOM overlays

#### 2. RendererRegistry (`renderers/RendererRegistry.tsx`)
Manages object type to renderer mapping:
- Register renderers for different object types
- Retrieve appropriate renderer for object rendering
- Supports extensible renderer system

#### 3. Renderers (`renderers/`)
Individual renderer components for different object types:
- **TextRenderer**: Handles text objects with styling and animations
- **ImageRenderer**: Handles image objects
- **ShapeRenderer**: Handles geometric shapes
- **DrawPathRenderer**: Handles custom drawn paths
- **SvgPathRenderer**: Handles SVG path animations

#### 4. AnimationEngine (`animation/AnimationEngine.tsx`)
Manages frame-based animations:
- RequestAnimationFrame-based clock
- Frame timing and performance monitoring
- Animation state management

#### 5. OverlayManager (`overlay/OverlayManager.tsx`)
Manages DOM overlays on the canvas:
- Create and position overlays
- Handle overlay lifecycle
- Performance monitoring for overlay churn

#### 6. Event Handling (`events/CanvasEvents.tsx`)
Keyboard and mouse event management:
- `useCanvasEvents`: Document-level keyboard shortcuts
- `usePointerEvents`: Pointer/touch event handling

#### 7. Object Controller (`controllers/useObjectController.tsx`)
Unified object interaction handling:
- Selection, dragging, transformation
- Event coordination between renderers

#### 8. Diagnostics (`diagnostics/CanvasDiagnostics.tsx`)
Performance monitoring and telemetry:
- Frame rate monitoring
- Memory usage tracking
- Performance bottleneck identification

## Usage

### Basic Setup

```tsx
import { CanvasProvider, useCanvasContext } from './canvas';

// Wrap your canvas component
<CanvasProvider>
  <YourCanvasComponent />
</CanvasProvider>

// Use context in child components
const MyComponent = () => {
  const { stage, layer, clock } = useCanvasContext();
  // ... use canvas context
};
```

### Registering Renderers

```tsx
import { rendererRegistry } from './canvas';
import { TextRenderer } from './canvas/renderers/TextRenderer';

// Register renderers
rendererRegistry.register('text', TextRenderer);
rendererRegistry.register('image', ImageRenderer);
// ... register other renderers
```

### Using Renderers

```tsx
import { rendererRegistry } from './canvas';

const renderObject = (obj: SceneObject) => {
  const Renderer = rendererRegistry.get(obj.type);
  if (Renderer) {
    return (
      <Renderer
        obj={obj}
        animatedProps={animatedProps}
        isSelected={isSelected}
        tool={tool}
        onClick={handleClick}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
    );
  }
  return null;
};
```

## Renderer Interface

All renderers must implement the `BaseRendererProps` interface:

```tsx
interface BaseRendererProps {
  obj: SceneObject;
  animatedProps: AnimatedProps;
  isSelected: boolean;
  tool: string;
  onClick: (e: any) => void;
  onDragEnd: (e: any) => void;
  onTransformEnd: (e: any) => void;
  onDblClick?: (id: string) => void;
}
```

## Animation System

The animation system uses `requestAnimationFrame` for smooth 60fps animations:

```tsx
import { animationEngine } from './canvas';

// Start animation
animationEngine.start();

// Subscribe to frame updates
const unsubscribe = animationEngine.clock.subscribe((time) => {
  // Update animations based on time
});

// Stop when done
animationEngine.stop();
```

## Event Handling

### Keyboard Events

```tsx
import { useCanvasEvents } from './canvas';

const { handleKeyDown } = useCanvasEvents(
  tool,
  setTool,
  onUndo,
  onRedo,
  canUndo,
  canRedo
);
```

### Pointer Events

```tsx
import { usePointerEvents } from './canvas';

const pointerHandlers = usePointerEvents(
  tool,
  onPointerDown,
  onPointerMove,
  onPointerUp
);
```

## Performance Monitoring

```tsx
import { canvasDiagnostics } from './canvas';

// Track frame performance
canvasDiagnostics.startFrame();
canvasDiagnostics.endFrame();

// Get performance metrics
const metrics = canvasDiagnostics.getMetrics();
```

## Testing

Unit tests are provided for core components:

- `TextRenderer.test.tsx`: Tests text rendering functionality
- `RendererRegistry.test.tsx`: Tests renderer registration and retrieval

Run tests with:
```bash
npm test -- --testPathPattern="canvas/__tests__"
```

## Migration Guide

### From Monolithic CanvasEditor

1. **Import the new modules**:
   ```tsx
   import {
     CanvasProvider,
     rendererRegistry,
     // ... other imports
   } from './canvas';
   ```

2. **Wrap with CanvasProvider**:
   ```tsx
   <CanvasProvider>
     <CanvasEditorRefactored />
   </CanvasProvider>
   ```

3. **Register renderers**:
   ```tsx
   // Register all renderers at component initialization
   rendererRegistry.register('text', TextRenderer);
   // ... register others
   ```

4. **Use renderer system**:
   Replace direct object rendering with:
   ```tsx
   const Renderer = rendererRegistry.get(obj.type);
   return Renderer ? <Renderer {...props} /> : null;
   ```

## Benefits

- **Modularity**: Clear separation of concerns
- **Extensibility**: Easy to add new renderers and features
- **Maintainability**: Smaller, focused components
- **Performance**: Optimized rendering and animation systems
- **Testability**: Unit tests for individual components
- **Reusability**: Components can be reused across different contexts

## Future Enhancements

- [ ] Add more renderer types (video, audio waveforms, etc.)
- [ ] Implement advanced animation curves
- [ ] Add renderer-specific optimization
- [ ] Enhance diagnostics with more metrics
- [ ] Add renderer caching for performance
