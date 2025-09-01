import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Transformer, Line } from 'react-konva';
import Konva from 'konva';
import { useAppStore } from '../store/appStore';
import CanvasSettings from './CanvasSettings';
import CameraControls from './CameraControls';
import TextPropertiesModal from './TextPropertiesModal';

// Import our new modular components
import {
  CanvasContext,
  rendererRegistry,
  animationEngine,
  useCanvasEvents,
  usePointerEvents
} from './canvas';

// Import renderers
import { TextRenderer } from './canvas/renderers/TextRenderer';
import { ImageRenderer } from './canvas/renderers/ImageRenderer';
import { ShapeRenderer } from './canvas/renderers/ShapeRenderer';
import { DrawPathRenderer } from './canvas/renderers/DrawPathRenderer';
import { SvgPathRenderer } from './canvas/renderers/SvgPathRenderer';
import { PathFollowerRenderer } from './canvas/renderers/PathFollowerRenderer';
import { AnimationTest } from './AnimationTest';
import { calculateAnimationProgress, getAnimatedProperties } from './canvas/utils/animationUtils';

// Register renderers
rendererRegistry.register('text', TextRenderer);
rendererRegistry.register('image', ImageRenderer);
rendererRegistry.register('shape', ShapeRenderer);
rendererRegistry.register('drawPath', DrawPathRenderer);
rendererRegistry.register('svgPath', SvgPathRenderer);
rendererRegistry.register('pathFollower', PathFollowerRenderer);

// Canvas Provider component
const CanvasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const overlayRootRef = useRef<HTMLDivElement>(null);

  const contextValue = {
    stage: stageRef.current,
    layer: layerRef.current,
    overlayRoot: overlayRootRef.current,
    clock: animationEngine,
  };

  return (
    <CanvasContext.Provider value={contextValue}>
      <div ref={overlayRootRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        {children}
      </div>
    </CanvasContext.Provider>
  );
};

// Main Canvas Editor component
const CanvasEditorRefactored: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<Konva.Layer>(null);

  const {
    currentProject,
    selectedObject,
    currentTime,
    isPlaying,
    addObject,
    updateObject,
    removeObject,
    selectObject,
    undo,
    canUndo,
    redo,
    canRedo,
  } = useAppStore();

  const [tool, setTool] = useState<'select' | 'pen'>('select');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [penType, setPenType] = useState<'brush' | 'highlighter' | 'dashed'>('brush');
  const [showCanvasSettings, setShowCanvasSettings] = useState(false);
  const [fitMode, setFitMode] = useState<'width' | 'contain'>('contain');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [hasMounted, setHasMounted] = useState(false);

  // Text properties modal state
  const [showTextPropertiesModal, setShowTextPropertiesModal] = useState(false);
  const [textPropertiesModalId, setTextPropertiesModalId] = useState<string | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [currentLineStyle, setCurrentLineStyle] = useState<{
    opacity?: number;
    dash?: number[];
    composite?: GlobalCompositeOperation;
  }>({});

  // Update canvas size based on container and fit mode (like original CanvasEditor)
  useEffect(() => {
    const updateSize = () => {
      const projW = currentProject?.width || 800;
      const projH = currentProject?.height || 600;
      const ratio = projW / projH;
      const el = canvasContainerRef.current;
      if (!el) return;
      const maxW = el.clientWidth - 8;
      const maxH = el.clientHeight - 8;
      if (fitMode === 'width') {
        const width = Math.max(100, maxW);
        setCanvasSize({ width, height: Math.round(width / ratio) });
      } else {
        let width = maxW;
        let height = Math.round(width / ratio);
        if (height > maxH) {
          height = maxH;
          width = Math.round(height * ratio);
        }
        setCanvasSize({ width: Math.max(100, width), height: Math.max(100, height) });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (canvasContainerRef.current) ro.observe(canvasContainerRef.current);
    return () => ro.disconnect();
  }, [currentProject?.width, currentProject?.height, fitMode]);

  // Calculate canvas scaling based on fit mode
  const getCanvasScale = useCallback(() => {
    if (!currentProject) return { scaleX: 1, scaleY: 1 };

    const projectWidth = currentProject.width || 800;
    const projectHeight = currentProject.height || 600;

    return {
      scaleX: canvasSize.width / projectWidth,
      scaleY: canvasSize.height / projectHeight
    };
  }, [currentProject, canvasSize]);

  const canvasScale = getCanvasScale();

  // Initialize animation engine
  useEffect(() => {
    setHasMounted(true);
    if (isPlaying) {
      animationEngine.start();
    }
  }, [isPlaying, currentProject]);

  // Force Stage re-render when canvas scale changes
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.draw();
    }
  }, [canvasScale.scaleX, canvasScale.scaleY, canvasSize]);

  // Handle transformer attachment when selection changes
  useEffect(() => {
    const stage = stageRef.current;
    const tr = transformerRef.current;
    if (!stage || !tr) return;

    if (!selectedObject) {
      console.log('CanvasEditorRefactored: Clearing transformer (no selection)');
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    console.log('CanvasEditorRefactored: Attaching transformer to:', selectedObject);

    // Locate the node by id - try multiple approaches
    let node = stage.findOne(`#${selectedObject}`);
    console.log('CanvasEditorRefactored: Found by ID selector:', !!node);
    
    if (!node) {
      // Try finding by name for SVG paths
      node = stage.findOne((n: any) => n.name?.() === `svg-path-${selectedObject}`);
      console.log('CanvasEditorRefactored: Found by name:', !!node);
    }
    
    if (!node) {
      // Try finding by ID in attrs
      node = stage.findOne((n: any) => n.attrs?.id === selectedObject);
      console.log('CanvasEditorRefactored: Found by attrs.id:', !!node);
    }
    
    if (!node) {
      // Try finding by ID method
      node = stage.findOne((n: any) => n.id?.() === selectedObject);
      console.log('CanvasEditorRefactored: Found by id():', !!node);
    }

    if (node) {
      console.log('CanvasEditorRefactored: Attaching transformer to node:', node.getClassName(), node.id?.());
      tr.nodes([node as any]);
      tr.getLayer()?.batchDraw();
    } else {
      console.warn('CanvasEditorRefactored: Could not find node for transformer:', selectedObject);
      // Log all nodes for debugging
      const allNodes = stage.find('.');
      console.log('CanvasEditorRefactored: All nodes:', allNodes.map((n: any) => ({ id: n.id?.(), name: n.name?.(), className: n.getClassName() })));
    }
  }, [selectedObject]);

  // Canvas event handlers
  const handleCanvasClick = useCallback(() => {
    if (tool === 'select') {
      selectObject(null);
    }
  }, [tool, selectObject]);

  const handleDrawingStart = useCallback((point: { x: number; y: number }) => {
    if (tool === 'pen') {
      // Derive style from pen type (from original CanvasEditor)
      const style = (() => {
        switch (penType) {
          case 'highlighter':
            return { opacity: 0.35, dash: undefined as number[] | undefined, composite: 'multiply' as const };
          case 'dashed':
            return { opacity: 1, dash: [strokeWidth * 2, Math.max(4, Math.round(strokeWidth * 1.2))], composite: 'source-over' as const };
          case 'brush':
          default:
            return { opacity: 1, dash: undefined as number[] | undefined, composite: 'source-over' as const };
        }
      })();

      setIsDrawing(true);
      setCurrentLineStyle(style);
      setCurrentPath([{ x: point.x, y: point.y }]);
    }
  }, [tool, penType, strokeWidth]);

  const handleDrawingMove = useCallback((point: { x: number; y: number }) => {
    if (isDrawing && tool === 'pen') {
      setCurrentPath(prev => [...prev, { x: point.x, y: point.y }]);
    }
  }, [isDrawing, tool]);

  const handleDrawingEnd = useCallback(() => {
    if (isDrawing && tool === 'pen' && currentPath.length > 1) {
      // Create a new draw path object
      const minX = Math.min(...currentPath.map(p => p.x));
      const minY = Math.min(...currentPath.map(p => p.y));
      const maxX = Math.max(...currentPath.map(p => p.x));
      const maxY = Math.max(...currentPath.map(p => p.y));
      
      addObject({
        id: `draw-${Date.now()}`,
        type: 'drawPath',
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        rotation: 0,
        properties: { 
          points: currentPath.map(p => ({ x: p.x - minX, y: p.y - minY })),
          strokeColor: strokeColor, 
          strokeWidth: strokeWidth,
          penType: penType,
          opacity: currentLineStyle.opacity,
          dash: currentLineStyle.dash,
          composite: currentLineStyle.composite
        },
        animationStart: 0,
        animationDuration: currentProject?.duration || 5,
        animationType: 'none',
        animationEasing: 'easeOut',
      });
    }
    setIsDrawing(false);
    setCurrentPath([]);
  }, [isDrawing, tool, currentPath, strokeColor, strokeWidth, penType, currentLineStyle, addObject, currentProject?.duration]);

  // Event hooks
  useCanvasEvents(
    tool,
    (newTool: string) => setTool(newTool as 'select' | 'pen'),
    undo,
    redo,
    canUndo(),
    canRedo()
  );

  // React-compatible keyboard handler for canvas container
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedObject) {
        removeObject(selectedObject);
      }
    }
  }, [selectedObject, removeObject]);

  // Text properties modal functions
  const openTextPropertiesModal = useCallback((textObjId: string) => {
    setTextPropertiesModalId(textObjId);
    setShowTextPropertiesModal(true);
    selectObject(textObjId);
  }, [selectObject]);

  const closeTextPropertiesModal = useCallback(() => {
    setShowTextPropertiesModal(false);
    setTextPropertiesModalId(null);
  }, []);

  const { handleMouseDown, handleMouseMove, handleMouseUp } = usePointerEvents(
    tool,
    handleCanvasClick,
    handleDrawingStart,
    handleDrawingMove,
    handleDrawingEnd
  );

  // Object event handlers
  const handleObjectClick = useCallback((e: any) => {
    // Try multiple ways to get the ID
    let id = e.currentTarget?.id?.() || e.target?.id?.() || e.currentTarget?.attrs?.id || e.target?.attrs?.id;
    
    // If still no ID, try to find it from the event target chain
    if (!id) {
      let target = e.target;
      while (target && !id) {
        id = target.id?.() || target.attrs?.id;
        target = target.getParent?.();
      }
    }
    
    if (id) {
      selectObject(id);

      // Attach transformer to selected object
      const stage = stageRef.current;
      const tr = transformerRef.current;
      if (stage && tr) {
        // Try multiple ways to find the node
        let node = stage.findOne(`#${id}`);
        
        if (!node) {
          node = stage.findOne((n: any) => n.id?.() === id || n.attrs?.id === id);
        }
        if (!node) {
          node = stage.findOne((n: any) => n.name?.() === `svg-path-${id}`);
        }
        
        if (node) {
          tr.nodes([node as any]);
          tr.getLayer()?.batchDraw();
        }
      }
    }
  }, [selectObject]);

  const handleObjectDrag = useCallback((id: string, node: any) => {
    console.log('CanvasEditorRefactored: handleObjectDrag called for ID:', id);
    const newX = node.x();
    const newY = node.y();
    console.log('CanvasEditorRefactored: New position:', newX, newY);
    updateObject(id, { x: newX, y: newY });
    console.log('CanvasEditorRefactored: Object updated');
  }, [updateObject]);

  const handleObjectDragMove = useCallback((id: string, node: any) => {
    console.log('CanvasEditorRefactored: handleObjectDragMove called for ID:', id);
    const newX = node.x();
    const newY = node.y();
    console.log('CanvasEditorRefactored: Drag move position:', newX, newY);
    updateObject(id, { x: newX, y: newY });
  }, [updateObject]);

  const handleObjectTransform = useCallback((id: string, node: any) => {
    console.log('CanvasEditorRefactored: handleObjectTransform called for ID:', id, 'Node type:', node.getClassName());

    const rotation = typeof node.rotation === 'function' ? node.rotation() : 0;
    const scaleX = typeof node.scaleX === 'function' ? node.scaleX() : 1;
    const scaleY = typeof node.scaleY === 'function' ? node.scaleY() : 1;
    const obj = currentProject?.objects.find((o) => o.id === id);
    const baseWidth = obj?.width ?? (typeof node.width === 'function' ? node.width() : 100);
    const baseHeight = obj?.height ?? (typeof node.height === 'function' ? node.height() : 100);
    const newWidth = Math.max(1, baseWidth * scaleX);
    const newHeight = Math.max(1, baseHeight * scaleY);
    const nx = typeof node.x === 'function' ? node.x() : node.x || 0;
    const ny = typeof node.y === 'function' ? node.y() : node.y || 0;

    if (obj && obj.type === 'text') {
      // Text resizing: horizontal scale adjusts width; vertical scale adjusts fontSize
      console.log('CanvasEditorRefactored: Handling text transform');
      const baseFont = obj.properties?.fontSize || 16;
      const newFont = Math.max(8, baseFont * scaleY);
      const ox = typeof node.offsetX === 'function' ? node.offsetX() : node.offsetX || 0;
      const oy = typeof node.offsetY === 'function' ? node.offsetY() : node.offsetY || 0;
      updateObject(id, {
        x: nx - ox,
        y: ny - oy,
        width: Math.max(20, newWidth),
        height: obj.height, // height is implied by font size; keep unchanged
        rotation,
        properties: { ...obj.properties, fontSize: newFont },
      });
    } else if (obj && obj.type === 'drawPath') {
      // Scale path points to match new size to avoid displacement
      console.log('CanvasEditorRefactored: Handling drawPath transform');
      const ox = typeof node.offsetX === 'function' ? node.offsetX() : node.offsetX || 0;
      const oy = typeof node.offsetY === 'function' ? node.offsetY() : node.offsetY || 0;
      const sx = baseWidth ? newWidth / baseWidth : 1;
      const sy = baseHeight ? newHeight / baseHeight : 1;

      const hasSegments = Array.isArray(obj.properties?.segments);
      const prevSegments: { x: number; y: number }[][] = hasSegments ? obj.properties.segments : [];
      const prevPoints: { x: number; y: number }[] = Array.isArray(obj.properties?.points) ? obj.properties.points : [];

      let scaledSegments: { x: number; y: number }[][] = [];
      let scaledPoints: { x: number; y: number }[] = [];

      if (hasSegments && prevSegments.length > 0) {
        scaledSegments = prevSegments.map(seg => seg.map(p => ({ x: p.x * sx, y: p.y * sy })));
      } else {
        scaledPoints = prevPoints.map(p => ({ x: p.x * sx, y: p.y * sy }));
      }

      // Normalize to a tight bounding box so the group frame matches visible content
      const allPoints = hasSegments
        ? scaledSegments.flat()
        : scaledPoints;

      if (allPoints.length > 0) {
        const minX = Math.min(...allPoints.map((p: any) => p.x));
        const minY = Math.min(...allPoints.map((p: any) => p.y));
        const maxX = Math.max(...allPoints.map((p: any) => p.x));
        const maxY = Math.max(...allPoints.map((p: any) => p.y));
        const tightW = Math.max(1, maxX - minX);
        const tightH = Math.max(1, maxY - minY);

        if (hasSegments) {
          const rebasedSegments = scaledSegments.map(seg => seg.map(p => ({ x: p.x - minX, y: p.y - minY })));
          updateObject(id, {
            x: nx - ox + minX,
            y: ny - oy + minY,
            width: tightW,
            height: tightH,
            rotation,
            properties: { ...obj.properties, segments: rebasedSegments },
          });
        } else {
          const rebasedPoints = scaledPoints.map((p: any) => ({ x: p.x - minX, y: p.y - minY }));
          updateObject(id, {
            x: nx - ox + minX,
            y: ny - oy + minY,
            width: tightW,
            height: tightH,
            rotation,
            properties: { ...obj.properties, points: rebasedPoints },
          });
        }
      } else {
        updateObject(id, {
          x: nx - ox,
          y: ny - oy,
          width: newWidth,
          height: newHeight,
          rotation,
          properties: { ...obj.properties, ...(hasSegments ? { segments: scaledSegments } : { points: scaledPoints }) },
        });
      }
    } else if (obj && obj.type === 'svgPath') {
      // SVG paths are Groups - use scaleX/scaleY for proper resizing
      console.log('CanvasEditorRefactored: Handling svgPath transform - scaleX:', scaleX, 'scaleY:', scaleY);
      const ox = typeof node.offsetX === 'function' ? node.offsetX() : node.offsetX || 0;
      const oy = typeof node.offsetY === 'function' ? node.offsetY() : node.offsetY || 0;
      updateObject(id, {
        x: nx - ox,
        y: ny - oy,
        rotation,
        properties: { ...obj.properties, scaleX, scaleY },
      });
    } else {
      // Default: offset-aware update using current offsets
      console.log('CanvasEditorRefactored: Handling default transform - width:', newWidth, 'height:', newHeight);
      const ox = typeof node.offsetX === 'function' ? node.offsetX() : node.offsetX || 0;
      const oy = typeof node.offsetY === 'function' ? node.offsetY() : node.offsetY || 0;
      updateObject(id, { x: nx - ox, y: ny - oy, width: newWidth, height: newHeight, rotation });
    }

    // Reset scale so width/height reflect the new size
    if (typeof node.scaleX === 'function') {
      node.scaleX(1);
      node.scaleY(1);
    }
  }, [currentProject, updateObject]);

  // Render objects using the new renderer system
  const renderObject = useCallback((obj: any) => {
    const progress = calculateAnimationProgress(
      currentTime,
      obj.animationStart || 0,
      obj.animationDuration || 5,
      obj.animationEasing || 'easeOut'
    );

    const animatedProps: any = getAnimatedProperties(obj, progress, obj.animationType);

    const isSelected = selectedObject === obj.id;
    const renderer = rendererRegistry.get(obj.type);

    if (renderer) {
      return React.createElement(renderer, {
        key: obj.id,
        obj,
        animatedProps,
        currentTime,
        isSelected,
        tool,
        onClick: handleObjectClick,
        onDragEnd: handleObjectDrag,
        onDragMove: handleObjectDragMove,
        onTransformEnd: handleObjectTransform,
        onDblClick: (id: string) => {
          // Handle double-click actions
          if (obj.type === 'text') {
            openTextPropertiesModal(id);
          }
        },
      });
    }

    // Fallback for unsupported types
    return null;
  }, [currentTime, selectedObject, tool, handleObjectClick, handleObjectDrag, handleObjectDragMove, handleObjectTransform, openTextPropertiesModal]);

  // Get board background
  const getBoardBackground = useCallback((style: string, color: string) => {
    switch (style) {
      case 'whiteboard': return '#ffffff';
      case 'blackboard': return '#000000';
      case 'greenboard': return '#0f5132';
      default: return color || '#ffffff';
    }
  }, []);

  if (!hasMounted) return null;

  return (
    <CanvasProvider>
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="bg-gray-800 border-b border-gray-600 p-2 flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <button
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${tool === 'pen' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
              onClick={() => setTool(tool === 'pen' ? 'select' : 'pen')}
              title={tool === 'pen' ? 'Stop Drawing (Esc or D)' : 'Start Drawing (D)'}
            >
              ✏️ {tool === 'pen' ? 'Stop' : 'Draw'}
            </button>

            <span className="text-[11px] px-2 py-0.5 rounded bg-gray-700 text-gray-200 border border-gray-600 cursor-help">
              D/Esc/V
            </span>

            <div className="flex items-center gap-2 ml-1">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="w-8 h-8 rounded border border-gray-600"
                title="Brush Color"
              />
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-24"
                title="Brush Size"
              />
              <span className="text-xs text-gray-300 w-6 text-center">{strokeWidth}</span>
              <select
                value={penType}
                onChange={(e) => setPenType(e.target.value as any)}
                className="bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded border border-gray-600"
                title="Pen Type"
              >
                <option value="brush">Brush</option>
                <option value="highlighter">Highlighter</option>
                <option value="dashed">Dashed</option>
              </select>
            </div>

            <button className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm font-medium" onClick={() => {
              // Add text object
              addObject({
                id: `text-${Date.now()}`,
                type: 'text',
                x: 100,
                y: 100,
                width: 200,
                height: 50,
                rotation: 0,
                properties: {
                  text: 'New Text',
                  fontSize: 24,
                  fontFamily: 'Arial',
                  fill: '#000000',
                },
                animationType: 'none',
                animationStart: 0,
                animationDuration: 1,
              });
            }}>
              📝 Text
            </button>

            {/* Text Properties Button - only show when text object is selected */}
            {selectedObject && currentProject?.objects.find(obj => obj.id === selectedObject)?.type === 'text' && (
              <button
                className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700 text-sm font-medium transition-colors"
                onClick={() => openTextPropertiesModal(selectedObject)}
                title="Edit Text Properties"
              >
                🎨 Text Props
              </button>
            )}

            <button
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${fitMode === 'width' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
              onClick={() => setFitMode(fitMode === 'width' ? 'contain' : 'width')}
              title={fitMode === 'width' ? 'Fit Mode: Width' : 'Fit Mode: Contain'}
            >
              {fitMode === 'width' ? '↔️ Fit Width' : '🧩 Fit Contain'}
            </button>

            <button className={`px-3 py-1 rounded text-sm font-medium transition-colors ${canUndo() ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`} onClick={canUndo() ? undo : undefined} disabled={!canUndo()} title="Undo">
              ↶ Undo
            </button>
            <button className={`px-3 py-1 rounded text-sm font-medium transition-colors ${canRedo() ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`} onClick={canRedo() ? redo : undefined} disabled={!canRedo()} title="Redo">
              ↷ Redo
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectedObject && (
              <button className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm font-medium" onClick={() => { removeObject(selectedObject); selectObject(null); }}>
                🗑️ Delete
              </button>
            )}
            <button
              className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700 text-sm font-medium"
              onClick={() => setShowCanvasSettings(true)}
            >
              ⚙️ Settings
            </button>
            <div className="ml-2"><CameraControls /></div>
          </div>
        </div>

        {/* Status bar */}
        <div className="bg-gray-700 px-3 py-1 text-xs text-gray-300 border-b border-gray-600">
          {currentProject ? <span>📁 {currentProject.name} {selectedObject && `| Selected: ${selectedObject.slice(0, 12)}...`}</span> : <span>⚠️ No project loaded</span>}
          <span className="ml-4 text-gray-400">💡 Use mouse wheel or arrow keys to scroll canvas</span>
        </div>

        {/* Canvas container */}
        <div
          ref={canvasContainerRef}
          className="flex-1 bg-gray-200 overflow-auto flex items-center justify-center p-4 scrollbar-thin scrollbar-track-gray-300 scrollbar-thumb-gray-500 hover:scrollbar-thumb-gray-600"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          style={{ outline: 'none' }}
        >
          <AnimationTest />
          <div
            ref={stageWrapperRef}
            className="rounded shadow-lg overflow-hidden relative min-w-fit min-h-fit"
            style={{
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              backgroundColor: currentProject?.backgroundColor || '#ffffff'
            }}
          >
            <Stage
              ref={stageRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{
                background: getBoardBackground(currentProject?.boardStyle || 'whiteboard', currentProject?.backgroundColor || '#ffffff'),
                cursor: tool === 'pen' ? 'crosshair' : 'default'
              }}
              scaleX={(currentProject?.cameraPosition?.zoom || 1) * canvasScale.scaleX}
              scaleY={(currentProject?.cameraPosition?.zoom || 1) * canvasScale.scaleY}
              x={currentProject?.cameraPosition?.x || 0}
              y={currentProject?.cameraPosition?.y || 0}
            >
              <Layer ref={layerRef}>
                {/* Background */}
                <Rect
                  id="canvas-bg"
                  x={0}
                  y={0}
                  width={currentProject?.width || 800}
                  height={currentProject?.height || 600}
                  fill="rgba(0,0,0,0)"
                  listening={true}
                  onMouseDown={() => {
                    if (tool === 'select') selectObject(null);
                  }}
                />

                {/* Temporary drawing lines - simple approach from original */}
                {isDrawing && currentPath.length > 1 && (
                  <Line
                    points={currentPath.flatMap(p => [p.x, p.y])}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    opacity={currentLineStyle.opacity ?? 1}
                    dash={currentLineStyle.dash}
                    globalCompositeOperation={currentLineStyle.composite as any}
                  />
                )}

                {/* Render objects using new system */}
                {(currentProject?.objects || []).map(renderObject)}

                {/* Transformer */}
                {selectedObject && (
                  <Transformer
                    ref={transformerRef}
                    keepRatio={(() => {
                      const sel = currentProject?.objects.find(o => o.id === selectedObject);
                      const lockRatio = sel?.type === 'text' || sel?.type === 'image' || (sel?.type === 'drawPath' && !!sel.properties?.assetSrc);
                      return !!lockRatio;
                    })()}
                    boundBoxFunc={(oldBox, newBox) => {
                      if (newBox.width < 5 || newBox.height < 5) {
                        return oldBox;
                      }
                      return newBox;
                    }}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Canvas Settings Modal */}
        {showCanvasSettings && (
          <CanvasSettings isOpen={showCanvasSettings} onClose={() => setShowCanvasSettings(false)} />
        )}

        {/* Text Properties Modal */}
        {showTextPropertiesModal && textPropertiesModalId && (
          <TextPropertiesModal
            isOpen={showTextPropertiesModal}
            onClose={closeTextPropertiesModal}
            textObjId={textPropertiesModalId}
          />
        )}
      </div>
    </CanvasProvider>
  );
};

export default CanvasEditorRefactored;
