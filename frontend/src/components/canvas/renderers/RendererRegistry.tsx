import React from 'react';

// Base interface for all renderers
export interface BaseRendererProps {
  obj: any;
  animatedProps: any;
  isSelected: boolean;
  tool: string;
  onClick: (e: any) => void;
  onDragEnd: (id: string, node: any) => void;
  onDragMove?: (id: string, node: any) => void;
  onTransformEnd: (id: string, node: any) => void;
  onDblClick?: (e: any) => void;
}

// Renderer function type
export type RendererFunction = React.ComponentType<BaseRendererProps>;

// Registry of renderers by object type
class RendererRegistry {
  private renderers: Map<string, RendererFunction> = new Map();

  register(type: string, renderer: RendererFunction): void {
    this.renderers.set(type, renderer);
  }

  get(type: string): RendererFunction | undefined {
    return this.renderers.get(type);
  }

  has(type: string): boolean {
    return this.renderers.has(type);
  }

  getAllTypes(): string[] {
    return Array.from(this.renderers.keys());
  }
}

// Global registry instance
export const rendererRegistry = new RendererRegistry();
