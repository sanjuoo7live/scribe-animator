import React from 'react';

// Base renderer props interface
export interface BaseRendererProps {
  obj: any;
  animatedProps: any;
  isSelected: boolean;
  tool: string;
  onClick: (e: any) => void;
  onDragEnd: (id: string, node: any) => void;
  onDragMove?: (id: string, node: any) => void;
  onTransformEnd: (id: string, node: any) => void;
}

// Renderer registry class
export class RendererRegistry {
  private static instance: RendererRegistry;
  private renderers: Map<string, React.ComponentType<BaseRendererProps>> = new Map();

  static getInstance(): RendererRegistry {
    if (!RendererRegistry.instance) {
      RendererRegistry.instance = new RendererRegistry();
    }
    return RendererRegistry.instance;
  }

  register(type: string, renderer: React.ComponentType<BaseRendererProps>) {
    this.renderers.set(type, renderer);
  }

  get(type: string): React.ComponentType<BaseRendererProps> | undefined {
    return this.renderers.get(type);
  }

  getAll(): Map<string, React.ComponentType<BaseRendererProps>> {
    return this.renderers;
  }
}

// Export singleton instance
export const rendererRegistry = RendererRegistry.getInstance();
