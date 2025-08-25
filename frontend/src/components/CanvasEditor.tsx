import React from 'react';
import { Stage, Layer, Line, Text, Rect, Circle, Star, RegularPolygon, Arrow, Transformer, Group } from 'react-konva';
import Konva from 'konva';
import { useAppStore } from '../store/appStore';
import CanvasSettings from './CanvasSettings';
import CameraControls from './CameraControls';

const CanvasEditor: React.FC = () => {
  const stageRef = React.useRef<Konva.Stage>(null);
  const transformerRef = React.useRef<Konva.Transformer>(null);
  const canvasContainerRef = React.useRef<HTMLDivElement>(null);

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
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [lines, setLines] = React.useState<{ points: number[]; stroke: string; strokeWidth: number }[]>([]);
  const [editingText, setEditingText] = React.useState<string | null>(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [showCanvasSettings, setShowCanvasSettings] = React.useState(false);
  const [fitMode, setFitMode] = React.useState<'width' | 'contain'>('contain');
  const [canvasSize, setCanvasSize] = React.useState({ width: 800, height: 600 });

  // Deselect on Escape key
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectObject(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectObject]);

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
    const p = stage.getPointerPosition();
    return p || { x: 0, y: 0 };
  };

  const handleMouseDown = () => {
    if (tool !== 'pen') return;
    setIsDrawing(true);
    const pos = getPointer();
    setLines((prev) => prev.concat([{ points: [pos.x, pos.y], stroke: strokeColor, strokeWidth }]));
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
      properties: { points, strokeColor: last.stroke, strokeWidth: last.strokeWidth },
      animationStart: 0,
      animationDuration: currentProject?.duration || 5,
      animationType: 'none',
      animationEasing: 'easeOut',
    });
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
    }
  };

  const saveTextEdit = () => {
    if (editingText && editingValue.trim()) {
      const prev = currentProject?.objects.find((o) => o.id === editingText);
      updateObject(editingText, { properties: { ...prev?.properties, text: editingValue } });
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
      width: 200,
      height: 50,
      rotation: 0,
      properties: { text: 'Text', fontSize: 24, fill: '#000' },
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

  React.useEffect(() => {
    if (!selectedObject || !stageRef.current || !transformerRef.current) return;
    const node = stageRef.current.findOne(`#${selectedObject}`);
    if (node) {
      transformerRef.current.nodes([node as any]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedObject, currentProject?.objects]);

  const getBoardBackground = (boardStyle: string): string => {
    switch (boardStyle) {
      case 'chalkboard-dark':
        return '#2d3748';
      case 'chalkboard-green':
        return '#2f855a';
      case 'glassboard':
        return 'linear-gradient(135deg, #f7fafc 0%, #e2e8f0 100%)';
      case 'whiteboard':
      default:
        return '#ffffff';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-800 border-b border-gray-600 p-2 flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <button className={`px-3 py-1 rounded text-sm font-medium transition-colors ${tool === 'pen' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`} onClick={() => setTool('pen')}>✏️ Draw</button>
          <button className={`px-3 py-1 rounded text-sm font-medium transition-colors ${tool === 'select' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`} onClick={() => setTool('select')}>👆 Select</button>
          <button className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm font-medium" onClick={addText}>📝 Text</button>
          <button className={`px-3 py-1 rounded text-sm font-medium transition-colors ${fitMode === 'width' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`} onClick={() => setFitMode(fitMode === 'width' ? 'contain' : 'width')} title={fitMode === 'width' ? 'Fit Mode: Width (click to switch to Contain)' : 'Fit Mode: Contain (click to switch to Width)'}>
            {fitMode === 'width' ? '↔️ Fit Width' : '🧩 Fit Contain'}
          </button>
          <div className="w-px h-4 bg-gray-500 mx-2" />
          <button className={`px-3 py-1 rounded text-sm font-medium transition-colors ${canUndo() ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`} onClick={canUndo() ? undo : undefined} disabled={!canUndo()} title="Undo (Ctrl/Cmd + Z)">↶ Undo</button>
          <button className={`px-3 py-1 rounded text-sm font-medium transition-colors ${canRedo() ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`} onClick={canRedo() ? redo : undefined} disabled={!canRedo()} title="Redo (Ctrl/Cmd + Shift + Z)">↷ Redo</button>
          <div className="w-px h-4 bg-gray-500 mx-2" />
          <div className="flex items-center gap-2">
            <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-8 h-8 rounded border border-gray-600" />
            <input type="range" min="1" max="20" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="w-20" />
            <span className="text-xs text-gray-300 w-6 text-center">{strokeWidth}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedObject && (
            <button className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm font-medium" onClick={() => { removeObject(selectedObject); selectObject(null); }}>🗑️ Delete</button>
          )}
          <button className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700 text-sm font-medium" onClick={() => setShowCanvasSettings(true)}>⚙️ Settings</button>
          <div className="ml-2"><CameraControls /></div>
        </div>
      </div>

      <div className="bg-gray-700 px-3 py-1 text-xs text-gray-300 border-b border-gray-600">
        {currentProject ? <span>📁 {currentProject.name} {selectedObject && `| Selected: ${selectedObject.slice(0, 12)}...`}</span> : <span>⚠️ No project loaded</span>}
      </div>

      <div ref={canvasContainerRef} className="flex-1 bg-gray-200 overflow-hidden flex items-center justify-center p-4">
        <div className="rounded shadow-lg overflow-hidden" style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px`, backgroundColor: currentProject?.backgroundColor || '#ffffff' }}>
          <Stage
            ref={stageRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleMouseDown}
            onTap={handleMouseDown}
            style={{ background: getBoardBackground(currentProject?.boardStyle || 'whiteboard') }}
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
                <Line key={i} points={line.points} stroke={line.stroke} strokeWidth={line.strokeWidth} tension={0.5} lineCap="round" lineJoin="round" />
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
                  return (
          <Text key={obj.id} id={obj.id} x={animatedProps.x ?? obj.x} y={animatedProps.y ?? obj.y}
      text={obj.properties.text || 'Text'} fontSize={obj.properties.fontSize || 16} width={obj.width || 1} rotation={obj.rotation || 0}
                      scaleX={animatedProps.scaleX ?? 1} scaleY={animatedProps.scaleY ?? 1} opacity={animatedProps.opacity ?? 1}
                      fill={isSelected ? '#4f46e5' : obj.properties.fill || '#000'} draggable={tool === 'select'}
                      onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.target); }} onDblClick={() => handleTextDoubleClick(obj.id)}
                      onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)} onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)} />
                  );
                }

                if (obj.type === 'image') {
                  const assetType = obj.properties.assetType;
                  if (['hand', 'character', 'prop'].includes(assetType)) {
                    return (
                      <Text key={obj.id} id={obj.id} x={animatedProps.x ?? obj.x} y={animatedProps.y ?? obj.y}
                        text={obj.properties.src || obj.properties.alt || '❓'} fontSize={Math.max((obj.width || 80) * 0.9, 24)} rotation={obj.rotation || 0}
                        scaleX={animatedProps.scaleX ?? 1} scaleY={animatedProps.scaleY ?? 1} opacity={animatedProps.opacity ?? 1}
                        fill={isSelected ? '#4f46e5' : '#000000'} stroke={isSelected ? '#4f46e5' : 'transparent'} strokeWidth={isSelected ? 1 : 0}
                        draggable={tool === 'select'} onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.target); }}
                        onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)} onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)} />
                    );
                  }
                  return (
                    <Rect key={obj.id} id={obj.id} x={obj.x} y={obj.y} width={obj.width || 100} height={obj.height || 100} rotation={obj.rotation || 0}
                      fill={isSelected ? '#e0e7ff' : '#f3f4f6'} stroke={isSelected ? '#4f46e5' : '#9ca3af'} strokeWidth={2} draggable={tool === 'select'}
                      onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.target); }} onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)} onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)} />
                  );
                }

                if (obj.type === 'drawPath') {
                  const pts = obj.properties.points || [];
                  const flat = pts.reduce((acc: number[], p: { x: number; y: number }) => acc.concat([p.x + obj.x, p.y + obj.y]), [] as number[]);
                  if (flat.length > 3) {
                    return (
                      <Line key={obj.id} id={obj.id} points={flat} rotation={obj.rotation || 0}
                        stroke={isSelected ? '#4f46e5' : obj.properties.strokeColor || '#000'} strokeWidth={(obj.properties.strokeWidth || 2) + (isSelected ? 1 : 0)}
                        lineCap="round" lineJoin="round" draggable={tool === 'select'}
                        onClick={(e) => { e.cancelBubble = true; handleObjectClick(obj.id, e.target); }} onDragEnd={(e) => handleObjectDrag(obj.id, e.currentTarget)} onTransformEnd={(e) => handleObjectTransform(obj.id, e.currentTarget)} />
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-2xl w-[480px] max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4 text-white">Edit Text</h3>
            <input type="text" value={editingValue} onChange={(e) => setEditingValue(e.target.value)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded mb-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500" placeholder="Enter text..." autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveTextEdit(); if (e.key === 'Escape') cancelTextEdit(); }} />
            <div className="flex gap-2 justify-end">
              <button onClick={cancelTextEdit} className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 border border-gray-600">Cancel</button>
              <button onClick={saveTextEdit} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 border border-blue-500">Save</button>
            </div>
          </div>
        </div>
      )}

      <CanvasSettings isOpen={showCanvasSettings} onClose={() => setShowCanvasSettings(false)} />
    </div>
  );
};

export default CanvasEditor;