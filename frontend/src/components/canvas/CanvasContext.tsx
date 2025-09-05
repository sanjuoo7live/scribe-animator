import React from 'react';
import Konva from 'konva';
// PHASE1: import preview flag for DPR cap
import { preview } from '../core/SvgImporter';

// Canvas Context provides access to core canvas elements and services
export interface CanvasContextType {
  stage: Konva.Stage | null;
  layer: Konva.Layer | null;
  overlayRoot: HTMLDivElement | null;
  clock: {
    subscribe: (callback: (time: number) => void) => () => void;
    getTime: () => number;
    start: () => void;
    stop: () => void;
  };
  // PHASE0: refs for static and animated layers
  staticLayerRef?: React.RefObject<Konva.Layer | null>;
  animatedLayerRef?: React.RefObject<Konva.Layer | null>;
  // PHASE1: DPR cap for preview performance
  getEffectiveDpr: () => number;
}

export const CanvasContext = React.createContext<CanvasContextType | null>(null);

export const useCanvasContext = (): CanvasContextType => {
  const context = React.useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider');
  }
  return context;
};

// PHASE0: optional hook that returns null outside provider
export const useCanvasContextOptional = (): CanvasContextType | null => React.useContext(CanvasContext);
