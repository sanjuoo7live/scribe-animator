import { rendererRegistry } from './RendererRegistry';
import { SvgPathRenderer } from './SvgPathRenderer';
import { TextRenderer } from './TextRenderer';
import { ImageRenderer } from './ImageRenderer';
import { ShapeRenderer } from './ShapeRenderer';
import { DrawPathRenderer } from './DrawPathRenderer';

// Register all renderers
export const setupRenderers = () => {
  rendererRegistry.register('svgPath', SvgPathRenderer);
  rendererRegistry.register('text', TextRenderer);
  rendererRegistry.register('image', ImageRenderer);
  rendererRegistry.register('shape', ShapeRenderer);
  rendererRegistry.register('drawPath', DrawPathRenderer);
};
