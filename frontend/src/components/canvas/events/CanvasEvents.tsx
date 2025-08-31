import { useEffect, useCallback } from 'react';

// Keyboard shortcuts and event handling
export const useCanvasEvents = (
  tool: string,
  setTool: (tool: string) => void,
  onUndo: () => void,
  onRedo: () => void,
  canUndo: boolean,
  canRedo: boolean
) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case 'D':
      case 'd':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setTool(tool === 'pen' ? 'select' : 'pen');
        }
        break;
      case 'V':
      case 'v':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setTool('select');
        }
        break;
      case 'Escape':
        e.preventDefault();
        setTool('select');
        break;
      case 'Delete':
      case 'Backspace':
        // Handle delete (would need selected object context)
        break;
      case 'z':
      case 'Z':
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          if (canUndo) onUndo();
        } else if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
          e.preventDefault();
          if (canRedo) onRedo();
        }
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Handle canvas panning (would need canvas context)
        break;
    }
  }, [tool, setTool, onUndo, onRedo, canUndo, canRedo]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    handleKeyDown,
  };
};

// Mouse/touch event handlers
export const usePointerEvents = (
  tool: string,
  onCanvasClick: () => void,
  onDrawingStart: (point: { x: number; y: number }) => void,
  onDrawingMove: (point: { x: number; y: number }) => void,
  onDrawingEnd: () => void
) => {
  const getPointer = (stage: any) => {
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    // convert screen coords to stage (content) coords accounting for scale and pan
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const scenePos = transform.point(pos);
    return { x: scenePos.x, y: scenePos.y };
  };

  const handleMouseDown = useCallback((e: any) => {
    if (tool === 'pen') {
      const stage = e.target.getStage();
      const pos = getPointer(stage);
      onDrawingStart({ x: pos.x, y: pos.y });
    } else {
      // Check if clicking on background
      if (e.target.id() === 'canvas-bg') {
        onCanvasClick();
      }
    }
  }, [tool, onCanvasClick, onDrawingStart]);

  const handleMouseMove = useCallback((e: any) => {
    if (tool === 'pen' && e.evt.buttons === 1) {
      const stage = e.target.getStage();
      const pos = getPointer(stage);
      onDrawingMove({ x: pos.x, y: pos.y });
    }
  }, [tool, onDrawingMove]);

  const handleMouseUp = useCallback(() => {
    if (tool === 'pen') {
      onDrawingEnd();
    }
  }, [tool, onDrawingEnd]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
};
