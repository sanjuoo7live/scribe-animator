import React from 'react';
import { rendererRegistry, BaseRendererProps } from '../renderers/RendererRegistry';

// Mock renderer component
const MockRenderer: React.FC<BaseRendererProps> = () => <div>Mock Renderer</div>;

describe('RendererRegistry', () => {
  beforeEach(() => {
    // Clear the registry before each test
    (rendererRegistry as any).renderers.clear();
  });

  describe('register', () => {
    it('should register a renderer for a given type', () => {
      rendererRegistry.register('test', MockRenderer);

      expect(rendererRegistry.has('test')).toBe(true);
    });

    it('should allow registering multiple renderers', () => {
      const MockRenderer2: React.FC<BaseRendererProps> = () => <div>Mock Renderer 2</div>;

      rendererRegistry.register('test1', MockRenderer);
      rendererRegistry.register('test2', MockRenderer2);

      expect(rendererRegistry.has('test1')).toBe(true);
      expect(rendererRegistry.has('test2')).toBe(true);
    });

    it('should allow overwriting existing renderers', () => {
      const MockRenderer2: React.FC<BaseRendererProps> = () => <div>Mock Renderer 2</div>;

      rendererRegistry.register('test', MockRenderer);
      expect(rendererRegistry.get('test')).toBe(MockRenderer);

      rendererRegistry.register('test', MockRenderer2);
      expect(rendererRegistry.get('test')).toBe(MockRenderer2);
    });
  });

  describe('get', () => {
    it('should return the registered renderer for a given type', () => {
      rendererRegistry.register('test', MockRenderer);

      const retrieved = rendererRegistry.get('test');
      expect(retrieved).toBe(MockRenderer);
    });

    it('should return undefined for unregistered types', () => {
      const retrieved = rendererRegistry.get('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for registered types', () => {
      rendererRegistry.register('test', MockRenderer);
      expect(rendererRegistry.has('test')).toBe(true);
    });

    it('should return false for unregistered types', () => {
      expect(rendererRegistry.has('nonexistent')).toBe(false);
    });
  });

  describe('integration with renderers', () => {
    it('should work with mock renderer components', () => {
      const MockTextRenderer: React.FC<BaseRendererProps> = () => <div>Text</div>;
      const MockImageRenderer: React.FC<BaseRendererProps> = () => <div>Image</div>;

      rendererRegistry.register('text', MockTextRenderer);
      rendererRegistry.register('image', MockImageRenderer);

      expect(rendererRegistry.has('text')).toBe(true);
      expect(rendererRegistry.has('image')).toBe(true);
      expect(rendererRegistry.get('text')).toBe(MockTextRenderer);
      expect(rendererRegistry.get('image')).toBe(MockImageRenderer);
    });
  });
});
