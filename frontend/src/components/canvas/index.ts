// Canvas module exports
export { CanvasContext, useCanvasContext, useCanvasContextOptional } from './CanvasContext';
export { rendererRegistry } from './renderers/RendererRegistry';
export { animationEngine, AnimationEngine } from './animation/AnimationEngine';
export { useObjectController } from './controllers/useObjectController';
export { useCanvasEvents, usePointerEvents } from './events/CanvasEvents';
export { canvasDiagnostics, CanvasDiagnostics } from './diagnostics/CanvasDiagnostics';

// Renderer exports
export { SvgPathRenderer } from './renderers/SvgPathRenderer';
export { TextRenderer } from './renderers/TextRenderer';
export { ImageRenderer } from './renderers/ImageRenderer';
export { ShapeRenderer } from './renderers/ShapeRenderer';
export { DrawPathRenderer } from './renderers/DrawPathRenderer';
