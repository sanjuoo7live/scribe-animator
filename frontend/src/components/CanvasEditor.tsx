import React from 'react';
import { Stage, Layer, Line, Text, Rect, Circle, Star, RegularPolygon, Arrow, Transformer, Group, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useAppStore } from '../store/appStore';
import CanvasSettings from './CanvasSettings';
import CameraControls from './CameraControls';

const CanvasEditor: React.FC = () => {
  const stageRef = React.useRef<Konva.Stage>(null);
  const transformerRef = React.useRef<Konva.Transformer>(null);
  const canvasContainerRef = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  const {
    currentProject,
    selectedObject,
    currentTime,
    addObject,
    updateObject,
    removeObject,
    selectObject,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAppStore();

  const [tool, setTool] = React.useState<'select' | 'pen'>('select');
  const [strokeColor, setStrokeColor] = React.useState('#000000');
  const [strokeWidth, setStrokeWidth] = React.useState(2);
  const [penType, setPenType] = React.useState<'brush' | 'highlighter' | 'dashed'>('brush');
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [lines, setLines] = React.useState<{
    points: number[];
    stroke: string;
    strokeWidth: number;
    opacity?: number;
    dash?: number[];
    composite?: GlobalCompositeOperation | 'multiply';
  }[]>([]);
  const [editingText, setEditingText] = React.useState<string | null>(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [editingTextProps, setEditingTextProps] = React.useState<{
    fontFamily: string;
    fontSize: number;
    fill: string;
    fontStyle: string;
    textDecoration: string;
    align: string;
    lineHeight: number;
    letterSpacing: number;
    strokeWidth: number;
    stroke: string;
  }>({
    fontFamily: 'Arial',
    fontSize: 28,
    fill: '#000000',
    fontStyle: 'normal',
    textDecoration: 'none',
    align: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
    strokeWidth: 0,
    stroke: '#000000'
  });
  // Text editor draggable state
  const textEditorRef = React.useRef<HTMLDivElement | null>(null);
  const [textEditorPos, setTextEditorPos] = React.useState<{ top: number; left: number } | null>(null);
  const textEditorPosRef = React.useRef<{ top: number; left: number }>({ top: 100, left: 100 });
  const textEditorDragStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const textEditorDraggingRef = React.useRef(false);
  const [showCanvasSettings, setShowCanvasSettings] = React.useState(false);
  const [fitMode, setFitMode] = React.useState<'width' | 'contain'>('contain');
  const [canvasSize, setCanvasSize] = React.useState({ width: 800, height: 600 });

  // Scroll handler for canvas container
  const handleCanvasScroll = React.useCallback((event: Event) => {
    const target = event.target as HTMLDivElement;
    // Track scroll position if needed for future features
    // Currently just handling the scroll event
    console.log('Canvas scrolled to:', { x: target.scrollLeft, y: target.scrollTop });
  }, []);

  // Setup scroll listener for canvas container
  React.useEffect(() => {
    const container = canvasContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleCanvasScroll);
      return () => container.removeEventListener('scroll', handleCanvasScroll);
    }
  }, [handleCanvasScroll]);

  // Center canvas in container when canvas is smaller than container
  const centerCanvas = React.useCallback(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth - 32; // Account for padding
    const containerHeight = container.clientHeight - 32; // Account for padding
    
    if (canvasSize.width < containerWidth) {
      const scrollX = Math.max(0, (canvasSize.width - containerWidth) / 2);
      container.scrollLeft = scrollX;
    }
    
    if (canvasSize.height < containerHeight) {
      const scrollY = Math.max(0, (canvasSize.height - containerHeight) / 2);
      container.scrollTop = scrollY;
    }
  }, [canvasSize]);

  // Center canvas when canvas size changes
  React.useEffect(() => {
    const timeoutId = setTimeout(centerCanvas, 100);
    return () => clearTimeout(timeoutId);
  }, [canvasSize, centerCanvas]);

  // Keyboard scrolling for canvas
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const container = canvasContainerRef.current;
      if (!container || !container.contains(document.activeElement)) return;

      const scrollSpeed = 20;
      let scrolled = false;

      switch (e.key) {
        case 'ArrowUp':
          container.scrollTop -= scrollSpeed;
          scrolled = true;
          break;
        case 'ArrowDown':
          container.scrollTop += scrollSpeed;
          scrolled = true;
          break;
        case 'ArrowLeft':
          container.scrollLeft -= scrollSpeed;
          scrolled = true;
          break;
        case 'ArrowRight':
          container.scrollLeft += scrollSpeed;
          scrolled = true;
          break;
      }

      if (scrolled) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debug Settings visibility state
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[CanvasEditor] showCanvasSettings =', showCanvasSettings);
  }, [showCanvasSettings]);

  // Set initial position for text editor when opened
  React.useLayoutEffect(() => {
    if (!editingText) return;
    // place at center-left
    const w = textEditorRef.current?.offsetWidth || 700;
    const h = textEditorRef.current?.offsetHeight || 600;
    const left = Math.max(20, (window.innerWidth - w) / 2 - 100);
    const top = Math.max(20, (window.innerHeight - h) / 2);
    textEditorPosRef.current = { top, left };
    setTextEditorPos({ top, left });
  }, [editingText]);

  // Text editor drag handlers
  const handleTextEditorDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    e.preventDefault();
    textEditorDraggingRef.current = true;
    textEditorDragStartRef.current = { x: e.clientX, y: e.clientY };
    // Ensure we start from actual on-screen coordinates
    if (textEditorRef.current) {
      const rect = textEditorRef.current.getBoundingClientRect();
      textEditorPosRef.current = { top: rect.top, left: rect.left };
      setTextEditorPos({ top: rect.top, left: rect.left });
    }
    // UX: indicate dragging & avoid accidental text selection
    document.body.style.cursor = 'grabbing';
    (document.body.style as any).userSelect = 'none';
    window.addEventListener('mousemove', handleTextEditorDragMove);
    window.addEventListener('mouseup', handleTextEditorDragEnd);
  };

  const handleTextEditorDragMove = (e: MouseEvent) => {
    if (!textEditorDraggingRef.current) return;
    const dx = e.clientX - textEditorDragStartRef.current.x;
    const dy = e.clientY - textEditorDragStartRef.current.y;
    const next = { top: textEditorPosRef.current.top + dy, left: textEditorPosRef.current.left + dx };
    // Clamp to viewport
    const w = textEditorRef.current?.offsetWidth || 0;
    const h = textEditorRef.current?.offsetHeight || 0;
    const maxLeft = Math.max(0, window.innerWidth - w);
    const maxTop = Math.max(0, window.innerHeight - h);
    const clamped = { top: Math.min(Math.max(0, next.top), maxTop), left: Math.min(Math.max(0, next.left), maxLeft) };
    setTextEditorPos(clamped);
  };

  const handleTextEditorDragEnd = () => {
    if (!textEditorDraggingRef.current) return;
    textEditorDraggingRef.current = false;
    if (textEditorPos) textEditorPosRef.current = { ...textEditorPos };
    window.removeEventListener('mousemove', handleTextEditorDragMove);
    window.removeEventListener('mouseup', handleTextEditorDragEnd);
    document.body.style.cursor = '';
    (document.body.style as any).userSelect = '';
  };

  // Cleanup text editor listeners on unmount
  React.useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleTextEditorDragMove);
      window.removeEventListener('mouseup', handleTextEditorDragEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: finish current stroke (commit to objects or discard)
  const finishCurrentStroke = React.useCallback((commit: boolean) => {
    setIsDrawing(false);
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      if (commit && last.points.length > 3) {
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < last.points.length; i += 2) {
          pts.push({ x: last.points[i], y: last.points[i + 1] });
        }
        addObject({
          id: `draw-${Date.now()}`,
          type: 'drawPath',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          rotation: 0,
          properties: { points: pts, strokeColor: last.stroke, strokeWidth: last.strokeWidth },
          animationStart: 0,
          animationDuration: currentProject?.duration || 5,
          animationType: 'none',
          animationEasing: 'easeOut',
        });
      }
      // remove preview stroke either way
      return prev.slice(0, -1);
    });
  }, [addObject, currentProject?.duration]);

  // Keyboard shortcuts: Escape to stop drawing/deselect, D to toggle draw, V to select, Delete to remove selected
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tool === 'pen') {
          e.preventDefault();
          // commit partial stroke then exit to select
          finishCurrentStroke(true);
          setTool('select');
        } else {
          selectObject(null);
        }
        return;
      }
      if ((e.key === 'd' || e.key === 'D') && !editingText) {
        e.preventDefault();
        if (tool === 'pen') {
          finishCurrentStroke(true);
          setTool('select');
        } else {
          setTool('pen');
        }
        return;
      }
      if ((e.key === 'v' || e.key === 'V') && !editingText) {
        e.preventDefault();
        if (tool === 'pen') finishCurrentStroke(true);
        setTool('select');
        selectObject(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObject && !editingText) {
        e.preventDefault();
        removeObject(selectedObject);
        selectObject(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tool, finishCurrentStroke, selectObject, removeObject, selectedObject, editingText]);

  React.useEffect(() => {
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

  const getPointer = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    // convert screen coords to stage (content) coords accounting for scale and pan
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const scenePos = transform.point(pos);
    return { x: scenePos.x, y: scenePos.y };
  };

  const handleMouseDown = () => {
    if (tool !== 'pen') return;
    // derive style from pen type
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
    const pos = getPointer();
    setLines((prev) => prev.concat([{ points: [pos.x, pos.y], stroke: strokeColor, strokeWidth, opacity: style.opacity, dash: style.dash, composite: style.composite }]));
  };

  const handleMouseMove = () => {
    if (!isDrawing || tool !== 'pen') return;
    const pos = getPointer();
    setLines((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const next = { ...last, points: last.points.concat([pos.x, pos.y]) };
      return [...prev.slice(0, -1), next];
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || tool !== 'pen') return;
    setIsDrawing(false);
    const last = lines[lines.length - 1];
    if (!last) return;
    const points = [] as { x: number; y: number }[];
    for (let i = 0; i < last.points.length; i += 2) {
      points.push({ x: last.points[i], y: last.points[i + 1] });
    }
    addObject({
      id: `draw-${Date.now()}`,
      type: 'drawPath',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rotation: 0,
      properties: {
        points,
        strokeColor: last.stroke,
        strokeWidth: last.strokeWidth,
        penType,
        opacity: last.opacity ?? 1,
        dash: last.dash,
        composite: last.composite,
      },
      animationStart: 0,
      animationDuration: currentProject?.duration || 5,
      animationType: 'none',
      animationEasing: 'easeOut',
    });
  // remove the preview line that was just committed
  setLines((prev) => prev.slice(0, -1));
  };
  const handleToggleDrawClick = () => {
    if (tool === 'pen') {
      // stopping draw: commit current stroke if any and switch to select
      finishCurrentStroke(true);
      setTool('select');
    } else {
      setTool('pen');
    }
  };

  const handleObjectDrag = (id: string, node: any) => {
    const nx = typeof node.x === 'function' ? node.x() : node.x || 0;
    const ny = typeof node.y === 'function' ? node.y() : node.y || 0;
    const obj = currentProject?.objects.find((o) => o.id === id);
    if (!obj) return;
    // Default: offset-aware calculation
    const ox = typeof node.offsetX === 'function' ? node.offsetX() : node.offsetX || 0;
    const oy = typeof node.offsetY === 'function' ? node.offsetY() : node.offsetY || 0;
    updateObject(id, { x: nx - ox, y: ny - oy });
  };

  const handleObjectTransform = (id: string, node: any) => {
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
  } else {
      // Default: offset-aware update using current offsets
      const ox = typeof node.offsetX === 'function' ? node.offsetX() : node.offsetX || 0;
      const oy = typeof node.offsetY === 'function' ? node.offsetY() : node.offsetY || 0;
      updateObject(id, { x: nx - ox, y: ny - oy, width: newWidth, height: newHeight, rotation });
    }

    // Reset scale so width/height reflect the new size
    if (typeof node.scaleX === 'function') {
      node.scaleX(1);
      node.scaleY(1);
    }
  };

  const handleObjectClick = (id: string, node?: any) => {
    selectObject(id);
    if (transformerRef.current && node) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  };

  const handleTextDoubleClick = (id: string) => {
    const textObj = currentProject?.objects.find((o) => o.id === id);
    if (textObj && textObj.type === 'text') {
      setEditingText(id);
      setEditingValue(textObj.properties.text || '');
      // Load existing text properties
      setEditingTextProps({
        fontFamily: textObj.properties.fontFamily || 'Arial',
        fontSize: textObj.properties.fontSize || 28,
        fill: textObj.properties.fill || '#000000',
        fontStyle: textObj.properties.fontStyle || 'normal',
        textDecoration: textObj.properties.textDecoration || 'none',
        align: textObj.properties.align || 'left',
        lineHeight: textObj.properties.lineHeight || 1.2,
        letterSpacing: textObj.properties.letterSpacing || 0,
        strokeWidth: textObj.properties.strokeWidth || 0,
        stroke: textObj.properties.stroke || '#000000'
      });
    }
  };

  const saveTextEdit = () => {
    if (editingText && editingValue.trim()) {
      const prev = currentProject?.objects.find((o) => o.id === editingText);
      updateObject(editingText, { 
        properties: { 
          ...prev?.properties, 
          text: editingValue,
          ...editingTextProps
        } 
      });
    }
    setEditingText(null);
    setEditingValue('');
  };

  const cancelTextEdit = () => {
    setEditingText(null);
    setEditingValue('');
  };

  const addText = () => {
    addObject({
      id: `text-${Date.now()}`,
      type: 'text',
      x: 150,
      y: 150,
      width: 300,
      height: 0,
      rotation: 0,
      properties: { 
        text: 'Text', 
        fontSize: 28, 
        fill: '#111',
        fontFamily: 'Arial',
        fontStyle: 'normal',
        textDecoration: 'none',
        align: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        strokeWidth: 0,
        stroke: '#000000'
      },
      animationStart: 0,
      animationDuration: currentProject?.duration || 5,
      animationType: 'none',
      animationEasing: 'easeOut',
    });
  };

  React.useEffect(() => {
    if (!stageRef.current || !transformerRef.current) return;
    const tr = transformerRef.current;
    if (!selectedObject) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const node = stageRef.current.findOne(`#${selectedObject}`);
    if (node) {
      tr.nodes([node as any]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedObject]);

  // Cleanup overlay iframes that no longer correspond to any objects
  React.useEffect(() => {
    const overlay = overlayRef.current;
    const ids = new Set((currentProject?.objects || []).filter(o => o.type === 'videoEmbed').map(o => `iframe-${o.id}`));
    if (!overlay) return;
    Array.from(overlay.querySelectorAll('iframe')).forEach((el) => {
      if (!ids.has(el.id)) {
        el.remove();
      }
    });
  }, [currentProject?.objects]);

  React.useEffect(() => {
    if (!selectedObject || !stageRef.current || !transformerRef.current) return;
    const node = stageRef.current.findOne(`#${selectedObject}`);
    if (node) {
      transformerRef.current.nodes([node as any]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedObject, currentProject?.objects]);

  const getBoardBackground = (boardStyle: string, customColor?: string): string => {
    switch (boardStyle) {
      case 'chalkboard-dark':
        return '#2d3748';
      case 'chalkboard-green':
        return '#2f855a';
      case 'glassboard':
        return 'linear-gradient(135deg, #f7fafc 0%, #e2e8f0 100%)';
      case 'custom':
        return customColor || '#e2e8f0';
      case 'whiteboard':
      default:
        return '#ffffff';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-800 border-b border-gray-600 p-2 flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <button
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${tool === 'pen' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
            onClick={handleToggleDrawClick}
            title={tool === 'pen' ? 'Stop Drawing (Esc or D)' : 'Start Drawing (D)'}
          >
            ✏️ {tool === 'pen' ? 'Stop' : 'Draw'}
          </button>
          {/* Shortcuts hint next to Draw */}
          <span
            className="text-[11px] px-2 py-0.5 rounded bg-gray-700 text-gray-200 border border-gray-600 cursor-help"
            title="Shortcuts: D = Toggle Draw, Esc = Stop, V = Select"
          >
            D/Esc/V
          </span>
          {/* Brush controls moved beside Draw */}
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
            <span className="text-xs text-gray-300 w-6 text-center" title="Brush Size">{strokeWidth}</span>
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
          <button className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm font-medium" onClick={addText}>📝 Text</button>
          <button className={`px-3 py-1 rounded text-sm font-medium transition-colors ${fitMode === 'width' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`} onClick={() => setFitMode(fitMode === 'width' ? 'contain' : 'width')} title={fitMode === 'width' ? 'Fit Mode: Width (click to switch to Contain)' : 'Fit Mode: Contain (click to switch to Width)'}>
            {fitMode === 'width' ? '↔️ Fit Width' : '🧩 Fit Contain'}
          </button>
          <div className="w-px h-4 bg-gray-500 mx-2" />
          <button className={`px-3 py-1 rounded text-sm font-medium transition-colors ${canUndo() ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`} onClick={canUndo() ? undo : undefined} disabled={!canUndo()} title="Undo (Ctrl/Cmd + Z)">↶ Undo</button>
          <button className={`px-3 py-1 rounded text-sm font-medium transition-colors ${canRedo() ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`} onClick={canRedo() ? redo : undefined} disabled={!canRedo()} title="Redo (Ctrl/Cmd + Shift + Z)">↷ Redo</button>
          
        </div>
        <div className="flex items-center gap-2">
          {selectedObject && (
            <button className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm font-medium" onClick={() => { removeObject(selectedObject); selectObject(null); }}>🗑️ Delete</button>
          )}
          <button
            className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700 text-sm font-medium"
            onClick={() => {
              // Debug: trace settings toggle
              // eslint-disable-next-line no-console
              console.log('[CanvasEditor] Settings button clicked');
              setShowCanvasSettings(true);
            }}
          >
            ⚙️ Settings
          </button>
          <div className="ml-2"><CameraControls /></div>
        </div>
      </div>

      <div className="bg-gray-700 px-3 py-1 text-xs text-gray-300 border-b border-gray-600">
        {currentProject ? <span>📁 {currentProject.name} {selectedObject && `| Selected: ${selectedObject.slice(0, 12)}...`}</span> : <span>⚠️ No project loaded</span>}
        <span className="ml-4 text-gray-400">💡 Use mouse wheel or arrow keys to scroll canvas</span>
      </div>

      <div 
        ref={canvasContainerRef} 
        className="flex-1 bg-gray-200 overflow-auto flex items-center justify-center p-4 scrollbar-thin scrollbar-track-gray-300 scrollbar-thumb-gray-500 hover:scrollbar-thumb-gray-600"
        tabIndex={0}
        style={{ outline: 'none' }}
      >
        <div className="rounded shadow-lg overflow-hidden relative min-w-fit min-h-fit" style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px`, backgroundColor: currentProject?.backgroundColor || '#ffffff' }}>
          {/* Absolute overlay for external iframes (video embeds) */}
          <div ref={overlayRef} className="absolute inset-0 pointer-events-none"></div>
          <Stage
            ref={stageRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ background: getBoardBackground(currentProject?.boardStyle || 'whiteboard', currentProject?.backgroundColor), cursor: tool === 'pen' ? 'crosshair' : 'default' }}
            scaleX={(currentProject?.cameraPosition?.zoom || 1) * (canvasSize.width / (currentProject?.width || 800))}
            scaleY={(currentProject?.cameraPosition?.zoom || 1) * (canvasSize.height / (currentProject?.height || 600))}
            x={currentProject?.cameraPosition?.x || 0}
            y={currentProject?.cameraPosition?.y || 0}
          >
            <Layer>
              {/* Clickable background to allow deselection when clicking blank space */}
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
              <Text text="Scribe Animator Canvas" x={50} y={50} fontSize={24} fill="gray" />

              {lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  opacity={line.opacity ?? 1}
                  dash={line.dash}
                  globalCompositeOperation={line.composite as any}
                />
              ))}

              {currentProject?.objects.map((obj) => {
                const animStart = obj.animationStart || 0;
                const animDuration = obj.animationDuration || 5;
                // Show objects at all times; clamp animation progression 0..1
                const progress = Math.min(Math.max((currentTime - animStart) / animDuration, 0), 1);
                const easing = obj.animationEasing || 'easeOut';
                const ease = (p: number) => {
                  switch (easing) {
                    case 'easeIn': return p * p;
                    case 'easeOut': return 1 - Math.pow(1 - p, 2);
                    case 'easeInOut': return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                    default: return p;
                  }
                };
                const ep = ease(progress);
                const animatedProps: any = {};
                switch (obj.animationType) {
                  case 'fadeIn': animatedProps.opacity = ep; break;
                  case 'scaleIn': animatedProps.scaleX = ep; animatedProps.scaleY = ep; break;
                  case 'slideIn': animatedProps.x = obj.x + (1 - ep) * 100; animatedProps.y = obj.y; break;
                }

                const isSelected = selectedObject === obj.id;

                // Video Embeds: draw a selectable proxy Rect in Konva and position an iframe on top
                if (obj.type === 'videoEmbed') {
                  const x = animatedProps.x ?? obj.x;
                  const y = animatedProps.y ?? obj.y;
                  const w = obj.width || 320;
                  const h = obj.height || 568;

                  // schedule iframe positioning after Konva renders
                  requestAnimationFrame(() => {
                    const overlay = overlayRef.current;
                    const stage = stageRef.current;
                    if (!overlay || !stage) return;
                    let iframe = overlay.querySelector(`#iframe-${obj.id}`) as HTMLIFrameElement | null;
                    if (!iframe) {
                      iframe = document.createElement('iframe');
                      iframe.id = `iframe-${obj.id}`;
                      iframe.src = obj.properties?.src || '';
                      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
                      iframe.referrerPolicy = 'no-referrer-when-downgrade';
                      iframe.style.position = 'absolute';
                      iframe.style.border = '0';
                      iframe.style.pointerEvents = isSelected ? 'auto' : 'none';
                      overlay.appendChild(iframe);
                    }
                    // Toggle pointer-events based on selection to allow interacting only when selected
                    iframe.style.pointerEvents = isSelected ? 'auto' : 'none';
                    // Convert stage coords to DOM coords
                    const transform = stage.getAbsoluteTransform().copy();
                    const p = transform.point({ x, y });
                    const scaleX = stage.scaleX() || 1;
                    const scaleY = stage.scaleY() || 1;
                    iframe.style.left = `${p.x}px`;
                    iframe.style.top = `${p.y}px`;
                    iframe.style.width = `${w * scaleX}px`;
                    iframe.style.height = `${h * scaleY}px`;
                    iframe.style.opacity = `${animatedProps.opacity ?? 1}`;
                  });

                  return (
                    <Rect
                      key={obj.id}
                      id={obj.id}
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rotation={obj.rotation || 0}
                      scaleX={animatedProps.scaleX ?? 1}
                      scaleY={animatedProps.scaleY ?? 1}
                      opacity={animatedProps.opacity ?? 1}
                      fill={isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(148,163,184,0.15)'}
                      stroke={isSelected ? '#4f46e5' : '#94a3b8'}
                      strokeWidth={2}
                      draggable={tool === 'select'}
                      onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.target); }}
                      onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)}
                      onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)}
                    />
                  );
                }
                

                if (obj.type === 'shape') {
                  const props = obj.properties;
                  // Rectangle (draw directly, not grouped)
                  if (props.shapeType === 'rectangle') {
                    return (
                      <Rect
                        key={obj.id}
                        id={obj.id}
                        x={animatedProps.x ?? obj.x}
                        y={animatedProps.y ?? obj.y}
                        width={obj.width || 100}
                        height={obj.height || 100}
                        rotation={obj.rotation || 0}
                        scaleX={animatedProps.scaleX ?? 1}
                        scaleY={animatedProps.scaleY ?? 1}
                        opacity={animatedProps.opacity ?? 1}
                        fill={props.fill || 'transparent'}
                        stroke={isSelected ? '#4f46e5' : props.stroke || '#000'}
                        strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                        draggable={tool === 'select'}
                        onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.target); }}
                        onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)}
                        onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)}
                      />
                    );
                  }

                  // Circle
                  if (props.shapeType === 'circle') {
                    const w = obj.width || 100;
                    const h = obj.height || 100;
                    return (
                      <Group
                        key={obj.id}
                        id={obj.id}
                        x={animatedProps.x ?? obj.x}
                        y={animatedProps.y ?? obj.y}
                        rotation={obj.rotation || 0}
                        scaleX={animatedProps.scaleX ?? 1}
                        scaleY={animatedProps.scaleY ?? 1}
                        opacity={animatedProps.opacity ?? 1}
                        draggable={tool === 'select'}
                        onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.currentTarget); }}
                        onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)}
                        onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)}
                      >
                        <Circle
                          x={w / 2}
                          y={h / 2}
                          radius={Math.min(w, h) / 2}
                          fill={props.fill || 'transparent'}
                          stroke={isSelected ? '#4f46e5' : props.stroke || '#000'}
                          strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                        />
                      </Group>
                    );
                  }

                  // Triangle
                  if (props.shapeType === 'triangle') {
                    const w = obj.width || 100;
                    const h = obj.height || 100;
                    const trianglePoints = [w / 2, 0, 0, h, w, h];
                    return (
                      <Group
                        key={obj.id}
                        id={obj.id}
                        x={animatedProps.x ?? obj.x}
                        y={animatedProps.y ?? obj.y}
                        rotation={obj.rotation || 0}
                        scaleX={animatedProps.scaleX ?? 1}
                        scaleY={animatedProps.scaleY ?? 1}
                        opacity={animatedProps.opacity ?? 1}
                        draggable={tool === 'select'}
                        onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.currentTarget); }}
                        onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)}
                        onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)}
                      >
                        <Line
                          points={trianglePoints}
                          closed
                          fill={props.fill || 'transparent'}
                          stroke={isSelected ? '#4f46e5' : props.stroke || '#000'}
                          strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                        />
                      </Group>
                    );
                  }

                  // Star
                  if (props.shapeType === 'star') {
                    const w = obj.width || 100;
                    const h = obj.height || 100;
                    return (
                      <Group
                        key={obj.id}
                        id={obj.id}
                        x={animatedProps.x ?? obj.x}
                        y={animatedProps.y ?? obj.y}
                        rotation={obj.rotation || 0}
                        scaleX={animatedProps.scaleX ?? 1}
                        scaleY={animatedProps.scaleY ?? 1}
                        opacity={animatedProps.opacity ?? 1}
                        draggable={tool === 'select'}
                        onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.currentTarget); }}
                        onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)}
                        onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)}
                      >
                        <Star
                          x={w / 2}
                          y={h / 2}
                          numPoints={5}
                          innerRadius={Math.min(w, h) / 4}
                          outerRadius={Math.min(w, h) / 2}
                          fill={props.fill || 'transparent'}
                          stroke={isSelected ? '#4f46e5' : props.stroke || '#000'}
                          strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                        />
                      </Group>
                    );
                  }

                  // Heart
                  if (props.shapeType === 'heart') {
                    const w = obj.width || 100;
                    const h = obj.height || 100;
                    const heartPoints = [w / 2, h * 0.3, w * 0.8, 0, w, h * 0.3, w / 2, h, 0, h * 0.3, w * 0.2, 0];
                    return (
                      <Group
                        key={obj.id}
                        id={obj.id}
                        x={animatedProps.x ?? obj.x}
                        y={animatedProps.y ?? obj.y}
                        rotation={obj.rotation || 0}
                        scaleX={animatedProps.scaleX ?? 1}
                        scaleY={animatedProps.scaleY ?? 1}
                        opacity={animatedProps.opacity ?? 1}
                        draggable={tool === 'select'}
                        onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.currentTarget); }}
                        onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)}
                        onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)}
                      >
                        <Line
                          points={heartPoints}
                          closed
                          fill={props.fill || 'transparent'}
                          stroke={isSelected ? '#4f46e5' : props.stroke || '#000'}
                          strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                        />
                      </Group>
                    );
                  }

                  // Arrow
                  if (props.shapeType === 'arrow') {
                    const w = Math.max(2, obj.width || 100);
                    const thickness = Math.max(2, obj.height || 8);
                    const groupX = animatedProps.x ?? obj.x;
                    const groupY = animatedProps.y ?? obj.y;
                    return (
                      <Group
                        key={obj.id}
                        id={obj.id}
                        x={groupX}
                        y={groupY}
                        rotation={obj.rotation || 0}
                        scaleX={animatedProps.scaleX ?? 1}
                        scaleY={animatedProps.scaleY ?? 1}
                        opacity={animatedProps.opacity ?? 1}
                        draggable={tool === 'select'}
                        onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.currentTarget); }}
                        onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)}
                        onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)}
                      >
                        <Arrow
                          points={[0, thickness / 2, w, thickness / 2]}
                          pointerLength={Math.max(10, Math.min(80, w * 0.25))}
                          pointerWidth={Math.max(6, thickness)}
                          fill={props.fill || 'transparent'}
                          stroke={isSelected ? '#4f46e5' : props.stroke || '#000'}
                          strokeWidth={props.strokeWidth || Math.max(2, Math.min(thickness, 16))}
                          lineCap="round"
                          lineJoin="round"
                          hitStrokeWidth={Math.max(10, thickness)}
                        />
                      </Group>
                    );
                  }

                  // Polygon (hexagon example)
                  if (props.shapeType === 'polygon') {
                    const w = obj.width || 100;
                    const h = obj.height || 100;
                    const radius = Math.min(w, h) / 2;
                    return (
                      <Group
                        key={obj.id}
                        id={obj.id}
                        x={animatedProps.x ?? obj.x}
                        y={animatedProps.y ?? obj.y}
                        rotation={obj.rotation || 0}
                        scaleX={animatedProps.scaleX ?? 1}
                        scaleY={animatedProps.scaleY ?? 1}
                        opacity={animatedProps.opacity ?? 1}
                        draggable={tool === 'select'}
                        onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.currentTarget); }}
                        onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)}
                        onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)}
                      >
                        <RegularPolygon
                          x={w / 2}
                          y={h / 2}
                          sides={6}
                          radius={radius}
                          fill={props.fill || 'transparent'}
                          stroke={isSelected ? '#4f46e5' : props.stroke || '#000'}
                          strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                        />
                      </Group>
                    );
                  }
                }

        if (obj.type === 'text') {
                  const props = obj.properties;
                  return (
                    <Text 
                      key={obj.id} 
                      id={obj.id} 
                      x={animatedProps.x ?? obj.x} 
                      y={animatedProps.y ?? obj.y}
                      text={props.text || 'Text'} 
                      fontSize={props.fontSize || 16} 
                      fontFamily={props.fontFamily || 'Arial'}
                      fontStyle={props.fontStyle || 'normal'}
                      textDecoration={props.textDecoration || 'none'}
                      align={props.align || 'left'}
                      lineHeight={props.lineHeight || 1.2}
                      letterSpacing={props.letterSpacing || 0}
                      width={obj.width && obj.width > 1 ? obj.width : undefined} 
                      rotation={obj.rotation || 0}
                      scaleX={animatedProps.scaleX ?? 1} 
                      scaleY={animatedProps.scaleY ?? 1} 
                      opacity={animatedProps.opacity ?? 1}
                      fill={isSelected ? '#4f46e5' : props.fill || '#000'} 
                      stroke={props.strokeWidth > 0 ? (isSelected ? '#4f46e5' : props.stroke || '#000') : undefined}
                      strokeWidth={props.strokeWidth || 0}
                      draggable={tool === 'select'}
                      onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.target); }} 
                      onDblClick={() => handleTextDoubleClick(obj.id)}
                      onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)} 
                      onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)} 
                    />
                  );
                }

                if (obj.type === 'image') {
                  const src: string | undefined = obj.properties?.src;
                  const looksLikeImage = !!src && (src.startsWith('http') || src.includes('/api/assets') || /\.(png|jpe?g|gif|svg)$/i.test(src));
                  if (!looksLikeImage) {
                    // Fallback to text/emoji if src is not a URL/path
                    return (
                      <Text
                        key={obj.id}
                        id={obj.id}
                        x={animatedProps.x ?? obj.x}
                        y={animatedProps.y ?? obj.y}
                        text={obj.properties.alt || '❓'}
                        fontSize={Math.max((obj.width || 80) * 0.9, 24)}
                        rotation={obj.rotation || 0}
                        scaleX={animatedProps.scaleX ?? 1}
                        scaleY={animatedProps.scaleY ?? 1}
                        opacity={animatedProps.opacity ?? 1}
                        fill={isSelected ? '#4f46e5' : '#000000'}
                        stroke={isSelected ? '#4f46e5' : 'transparent'}
                        strokeWidth={isSelected ? 1 : 0}
                        draggable={tool === 'select'}
                        onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.target); }}
                        onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)}
                        onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)}
                      />
                    );
                  }

                  // Render real image using Konva.Image
                  return (
                    <CanvasImage
                      key={obj.id}
                      id={obj.id}
                      obj={obj}
                      animatedProps={animatedProps}
                      isSelected={isSelected}
                      tool={tool}
                      onClick={handleObjectClick}
                      onDragEnd={handleObjectDrag}
                      onTransformEnd={handleObjectTransform}
                    />
                  );
                }

                if (obj.type === 'drawPath') {
                  const pts = obj.properties.points || [];
                  const flat = pts.reduce((acc: number[], p: { x: number; y: number }) => acc.concat([p.x + obj.x, p.y + obj.y]), [] as number[]);
                  if (flat.length > 3) {
                    return (
                      <Line
                        key={obj.id}
                        id={obj.id}
                        points={flat}
                        rotation={obj.rotation || 0}
                        stroke={isSelected ? '#4f46e5' : obj.properties.strokeColor || '#000'}
                        strokeWidth={(obj.properties.strokeWidth || 2) + (isSelected ? 1 : 0)}
                        opacity={obj.properties.opacity ?? 1}
                        dash={obj.properties.dash}
                        lineCap="round"
                        lineJoin="round"
                        draggable={tool === 'select'}
                        hitStrokeWidth={Math.max(12, (obj.properties.strokeWidth || 2) * 3)}
                        perfectDrawEnabled={false}
                        shadowForStrokeEnabled={false}
                        onMouseEnter={(e) => { if (tool === 'select') (e.target.getStage() as any)?.container().style.setProperty('cursor', 'pointer'); }}
                        onMouseLeave={(e) => { (e.target.getStage() as any)?.container().style.removeProperty('cursor'); }}
                        onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.target); }}
                        onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)}
                        onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)}
                      />
                    );
                  }
                }

                return null;
              })}

              <Transformer ref={transformerRef} boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                return newBox;
              }} />
            </Layer>
          </Stage>
        </div>
      </div>

      {editingText && (
        <div
          className="fixed inset-0 z-[99998] pointer-events-none"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 99998
          }}
        >
          {/* Text Editor Popup */}
          <div
            ref={textEditorRef}
            className="absolute bg-gray-800/98 text-white rounded-xl border border-gray-700 shadow-2xl ring-1 ring-white/10 p-6 w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto pointer-events-auto backdrop-blur-sm"
            style={{
              position: 'fixed',
              top: textEditorPos?.top ?? 100,
              left: textEditorPos?.left ?? Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 700 - 50),
              width: 700,
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              pointerEvents: 'auto',
              background: 'rgba(31,41,55,0.98)',
              color: '#fff',
              borderRadius: 12,
              border: '1px solid #374151',
              boxShadow: '0 20px 80px rgba(0,0,0,0.5)',
              padding: 24
            }}
          >
            {/* Draggable Header */}
            <div
              className="flex justify-between items-center mb-6 cursor-move select-none"
              onMouseDown={handleTextEditorDragStart}
            >
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>📝</span> Edit Text
              </h3>
              <button 
                onClick={cancelTextEdit}
                className="text-gray-400 hover:text-white text-2xl font-bold w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-700 transition-colors"
                onMouseDown={(e) => e.stopPropagation()}
              >
                ×
              </button>
            </div>
            
            {/* Text Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Text Content</label>
              <textarea 
                value={editingValue} 
                onChange={(e) => setEditingValue(e.target.value)} 
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none" 
                placeholder="Enter your text..." 
                rows={3}
                autoFocus 
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveTextEdit(); 
                  if (e.key === 'Escape') cancelTextEdit(); 
                }} 
              />
              <div className="text-xs text-gray-400 mt-1">Press Ctrl+Enter to save, Esc to cancel</div>
            </div>

            {/* Text Styling Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              
              {/* Font Family */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Font Family</label>
                <select 
                  value={editingTextProps.fontFamily} 
                  onChange={(e) => setEditingTextProps(prev => ({ ...prev, fontFamily: e.target.value }))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Impact">Impact</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                  <option value="Palatino">Palatino</option>
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Font Size</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="8" 
                    max="120" 
                    value={editingTextProps.fontSize} 
                    onChange={(e) => setEditingTextProps(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <input 
                    type="number" 
                    min="8" 
                    max="120" 
                    value={editingTextProps.fontSize} 
                    onChange={(e) => setEditingTextProps(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                    className="w-16 p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Text Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={editingTextProps.fill} 
                    onChange={(e) => setEditingTextProps(prev => ({ ...prev, fill: e.target.value }))}
                    className="w-12 h-10 rounded border border-gray-600 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={editingTextProps.fill} 
                    onChange={(e) => setEditingTextProps(prev => ({ ...prev, fill: e.target.value }))}
                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* Text Alignment */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Text Alignment</label>
                <div className="flex gap-1">
                  {['left', 'center', 'right', 'justify'].map(align => (
                    <button
                      key={align}
                      onClick={() => setEditingTextProps(prev => ({ ...prev, align }))}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        editingTextProps.align === align 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      title={`Align ${align}`}
                    >
                      {align === 'left' && '⬅️'}
                      {align === 'center' && '↔️'}
                      {align === 'right' && '➡️'}
                      {align === 'justify' && '📏'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Style Options */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Text Style</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setEditingTextProps(prev => ({ 
                    ...prev, 
                    fontStyle: prev.fontStyle.includes('bold') ? prev.fontStyle.replace(' bold', '').replace('bold', '') : `${prev.fontStyle} bold`.trim()
                  }))}
                  className={`px-3 py-2 rounded text-sm font-bold transition-colors ${
                    editingTextProps.fontStyle.includes('bold') 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  B
                </button>
                <button
                  onClick={() => setEditingTextProps(prev => ({ 
                    ...prev, 
                    fontStyle: prev.fontStyle.includes('italic') ? prev.fontStyle.replace(' italic', '').replace('italic', '') : `${prev.fontStyle} italic`.trim()
                  }))}
                  className={`px-3 py-2 rounded text-sm italic transition-colors ${
                    editingTextProps.fontStyle.includes('italic') 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  I
                </button>
                <button
                  onClick={() => setEditingTextProps(prev => ({ 
                    ...prev, 
                    textDecoration: prev.textDecoration === 'underline' ? 'none' : 'underline'
                  }))}
                  className={`px-3 py-2 rounded text-sm underline transition-colors ${
                    editingTextProps.textDecoration === 'underline' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  U
                </button>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Line Height */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Line Height</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="0.8" 
                    max="3" 
                    step="0.1" 
                    value={editingTextProps.lineHeight} 
                    onChange={(e) => setEditingTextProps(prev => ({ ...prev, lineHeight: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="w-12 text-xs text-gray-300 text-center">{editingTextProps.lineHeight.toFixed(1)}</span>
                </div>
              </div>

              {/* Letter Spacing */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Letter Spacing</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="-2" 
                    max="10" 
                    step="0.5" 
                    value={editingTextProps.letterSpacing} 
                    onChange={(e) => setEditingTextProps(prev => ({ ...prev, letterSpacing: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="w-12 text-xs text-gray-300 text-center">{editingTextProps.letterSpacing}px</span>
                </div>
              </div>

              {/* Stroke Width */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Outline Width</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    value={editingTextProps.strokeWidth} 
                    onChange={(e) => setEditingTextProps(prev => ({ ...prev, strokeWidth: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="w-12 text-xs text-gray-300 text-center">{editingTextProps.strokeWidth}px</span>
                </div>
              </div>

              {/* Stroke Color */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Outline Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={editingTextProps.stroke} 
                    onChange={(e) => setEditingTextProps(prev => ({ ...prev, stroke: e.target.value }))}
                    className="w-12 h-8 rounded border border-gray-600 cursor-pointer"
                    disabled={editingTextProps.strokeWidth === 0}
                  />
                  <input 
                    type="text" 
                    value={editingTextProps.stroke} 
                    onChange={(e) => setEditingTextProps(prev => ({ ...prev, stroke: e.target.value }))}
                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="#000000"
                    disabled={editingTextProps.strokeWidth === 0}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Preview</label>
              <div 
                className="p-4 bg-gray-900 border border-gray-600 rounded-lg min-h-[60px] flex items-center"
                style={{
                  fontFamily: editingTextProps.fontFamily,
                  fontSize: `${Math.min(editingTextProps.fontSize, 24)}px`,
                  color: editingTextProps.fill,
                  fontWeight: editingTextProps.fontStyle.includes('bold') ? 'bold' : 'normal',
                  fontStyle: editingTextProps.fontStyle.includes('italic') ? 'italic' : 'normal',
                  textDecoration: editingTextProps.textDecoration,
                  textAlign: editingTextProps.align as any,
                  lineHeight: editingTextProps.lineHeight,
                  letterSpacing: `${editingTextProps.letterSpacing}px`,
                  WebkitTextStroke: editingTextProps.strokeWidth > 0 ? `${Math.min(editingTextProps.strokeWidth, 2)}px ${editingTextProps.stroke}` : 'none'
                }}
              >
                {editingValue || 'Preview text...'}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-600">
              <button 
                onClick={cancelTextEdit} 
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 border border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveTextEdit} 
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 border border-blue-500 transition-colors font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <CanvasSettings isOpen={showCanvasSettings} onClose={() => setShowCanvasSettings(false)} />
    </div>
  );
};

// Lightweight image loader/renderer for Konva
const CanvasImage: React.FC<{
  id: string;
  obj: any;
  animatedProps: any;
  isSelected: boolean;
  tool: 'select' | 'pen';
  onClick: (id: string, node: any) => void;
  onDragEnd: (id: string, node: any) => void;
  onTransformEnd: (id: string, node: any) => void;
}> = ({ id, obj, animatedProps, isSelected, tool, onClick, onDragEnd, onTransformEnd }) => {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  const src = obj.properties?.src as string | undefined;

  React.useEffect(() => {
    if (!src) { setImage(null); return; }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    const handleLoad = () => setImage(img);
    const handleError = () => setImage(null);
    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    img.src = src;
    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src]);

  // While loading, show a subtle placeholder rect
  if (!image) {
    return (
      <Rect
        key={id}
        id={id}
        x={animatedProps.x ?? obj.x}
        y={animatedProps.y ?? obj.y}
        width={obj.width || 100}
        height={obj.height || 100}
        rotation={obj.rotation || 0}
        scaleX={animatedProps.scaleX ?? 1}
        scaleY={animatedProps.scaleY ?? 1}
        opacity={animatedProps.opacity ?? 1}
        fill={isSelected ? '#e0e7ff' : '#f3f4f6'}
        stroke={isSelected ? '#4f46e5' : '#9ca3af'}
        strokeWidth={2}
        draggable={tool === 'select'}
        onClick={(e) => { e.cancelBubble = true; onClick(id, e.target); }}
        onDragEnd={(e) => onDragEnd(id, e.currentTarget)}
        onTransformEnd={(e) => onTransformEnd(id, e.currentTarget)}
      />
    );
  }

  return (
    <KonvaImage
      key={id}
      id={id}
      x={animatedProps.x ?? obj.x}
      y={animatedProps.y ?? obj.y}
      image={image}
      width={obj.width || image.width}
      height={obj.height || image.height}
      rotation={obj.rotation || 0}
      scaleX={animatedProps.scaleX ?? 1}
      scaleY={animatedProps.scaleY ?? 1}
      opacity={animatedProps.opacity ?? 1}
      stroke={isSelected ? '#4f46e5' : undefined}
      strokeWidth={isSelected ? 1 : 0}
      draggable={tool === 'select'}
      onClick={(e) => { e.cancelBubble = true; onClick(id, e.target); }}
      onDragEnd={(e) => onDragEnd(id, e.currentTarget)}
      onTransformEnd={(e) => onTransformEnd(id, e.currentTarget)}
    />
  );
};

export default CanvasEditor;