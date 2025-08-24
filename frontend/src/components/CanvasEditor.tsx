import React, { useRef } from 'react';
import { Stage, Layer, Line, Text, Rect, Circle, Star, RegularPolygon, Arrow, Transformer } from 'react-konva';
import Konva from 'konva';
import { useAppStore } from '../store/appStore';
import CanvasSettings from './CanvasSettings';
import CameraControls from './CameraControls';

const CanvasEditor: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = React.useState('select');
  const [lines, setLines] = React.useState<any[]>([]);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [strokeColor, setStrokeColor] = React.useState('#000000');
  const [strokeWidth, setStrokeWidth] = React.useState(2);
  const [editingText, setEditingText] = React.useState<string | null>(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [showCanvasSettings, setShowCanvasSettings] = React.useState(false);
  const [canvasSize, setCanvasSize] = React.useState({ width: 800, height: 600 });
  const [fitMode, setFitMode] = React.useState<'contain' | 'width'>('width');

  const { currentProject, addObject, updateObject, selectObject, selectedObject, removeObject, currentTime } = useAppStore();

  // Responsive canvas sizing
  React.useEffect(() => {
  const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        const container = canvasContainerRef.current;
        const rect = container.getBoundingClientRect();
        const projectWidth = currentProject?.width || 800;
        const projectHeight = currentProject?.height || 600;
        
    // Calculate scale to fit container
    const scaleX = (rect.width - 40) / projectWidth; // 40px padding
    const scaleY = (rect.height - 40) / projectHeight;
    const base = fitMode === 'width' ? scaleX : Math.min(scaleX, scaleY);
    const scale = Math.max(base, 0.25); // don't go below 0.25x
        
        setCanvasSize({
          width: projectWidth * scale,
          height: projectHeight * scale
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [currentProject?.width, currentProject?.height, fitMode]);

  const handleMouseDown = (e: any) => {
    if (tool === 'pen') {
      setIsDrawing(true);
      const pos = e.target.getStage().getPointerPosition();
      setLines([...lines, { 
        tool, 
        points: [pos.x, pos.y],
        stroke: strokeColor,
        strokeWidth: strokeWidth
      }]);
      return;
    }

    // Check if clicked on stage background
    const target = e.target;
    if (target === target.getStage()) {
      selectObject(null);
      if (transformerRef.current) {
        transformerRef.current.nodes([]);
      }
      return;
    }

    // Check if clicked on object
    const objectId = target.attrs.id;
    if (objectId) {
      selectObject(objectId);
      if (transformerRef.current) {
        transformerRef.current.nodes([target]);
      }
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || tool !== 'pen') return;
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  const handleMouseUp = () => {
    if (!isDrawing || tool !== 'pen') return;
    
    setIsDrawing(false);
    
    // Save to project store
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      addObject({
        id: `line-${Date.now()}`,
        type: 'drawing',
        x: 0,
        y: 0,
        properties: lastLine
      });
    }
  };

  const addText = () => {
    const newText = {
      id: `text-${Date.now()}`,
      type: 'text' as const,
      x: 150,
      y: 150,
      width: 200,
      height: 50,
      properties: {
        text: 'Sample Text',
        fontSize: 24,
        fill: strokeColor,
        fontFamily: 'Arial'
      },
      animationStart: currentTime, // Start at current timeline position
      animationDuration: 5,
      animationType: 'fadeIn' as const,
      animationEasing: 'easeOut' as const
    };
    
    addObject(newText);
  };

  const handleObjectDrag = (id: string, newPos: { x: number; y: number }) => {
    updateObject(id, { x: newPos.x, y: newPos.y });
  };

  const handleObjectTransform = (id: string, node: any) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();
    
    // Apply scale to width/height and reset scale
    const newWidth = node.width() * scaleX;
    const newHeight = node.height() * scaleY;
    
    updateObject(id, {
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
      rotation: rotation
    });

    // Reset scale to 1 after applying
    node.scaleX(1);
    node.scaleY(1);
  };

  const handleObjectClick = (id: string, node?: any) => {
    selectObject(id);
    if (transformerRef.current && node) {
      transformerRef.current.nodes([node]);
    }
  };

  const handleTextDoubleClick = (id: string) => {
    const textObj = currentProject?.objects.find(obj => obj.id === id);
    if (textObj && textObj.type === 'text') {
      setEditingText(id);
      setEditingValue(textObj.properties.text || '');
    }
  };

  const saveTextEdit = () => {
    if (editingText && editingValue.trim()) {
      updateObject(editingText, {
        properties: {
          ...currentProject?.objects.find(obj => obj.id === editingText)?.properties,
          text: editingValue
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
      {/* Compact Top Toolbar - Outside Canvas */}
      <div className="bg-gray-800 border-b border-gray-600 p-2 flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <button
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${tool === 'pen' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
            onClick={() => setTool('pen')}
          >
            ✏️ Draw
          </button>
          <button
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${tool === 'select' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
            onClick={() => setTool('select')}
          >
            👆 Select
          </button>
          <button
            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm font-medium transition-colors"
            onClick={addText}
          >
            📝 Text
          </button>
          <button
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${fitMode === 'width' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
            onClick={() => setFitMode(fitMode === 'width' ? 'contain' : 'width')}
            title={fitMode === 'width' ? 'Fit Mode: Width (click to switch to Contain)' : 'Fit Mode: Contain (click to switch to Width)'}
          >
            {fitMode === 'width' ? '↔️ Fit Width' : '🧩 Fit Contain'}
          </button>
          
          <div className="w-px h-4 bg-gray-500 mx-2"></div>
          
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-8 h-8 rounded border border-gray-600 cursor-pointer"
              title="Color"
            />
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-20"
              title={`Brush Size: ${strokeWidth}px`}
            />
            <span className="text-xs text-gray-300 w-6 text-center">{strokeWidth}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedObject && (
            <button
              className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm font-medium transition-colors"
              onClick={() => {
                removeObject(selectedObject);
                selectObject(null);
              }}
            >
              🗑️ Delete
            </button>
          )}
          
          <button
            className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700 text-sm font-medium transition-colors"
            onClick={() => setShowCanvasSettings(true)}
          >
            ⚙️ Settings
          </button>
          
          <div className="ml-2">
            <CameraControls />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-700 px-3 py-1 text-xs text-gray-300 border-b border-gray-600">
        {currentProject ? (
          <span>📁 {currentProject.name} {selectedObject && `| Selected: ${selectedObject.slice(0, 12)}...`}</span>
        ) : (
          <span>⚠️ No project loaded</span>
        )}
      </div>

      {/* Canvas */}
      <div 
        ref={canvasContainerRef}
        className="flex-1 bg-gray-200 overflow-hidden flex items-center justify-center p-4"
      >
        <div 
          className="rounded shadow-lg overflow-hidden"
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
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            style={{
              background: getBoardBackground(currentProject?.boardStyle || 'whiteboard')
            }}
            scaleX={(currentProject?.cameraPosition?.zoom || 1) * (canvasSize.width / (currentProject?.width || 800))}
            scaleY={(currentProject?.cameraPosition?.zoom || 1) * (canvasSize.height / (currentProject?.height || 600))}
            x={currentProject?.cameraPosition?.x || 0}
            y={currentProject?.cameraPosition?.y || 0}
          >
            <Layer>
              <Text
                text="Scribe Animator Canvas"
                x={50}
                y={50}
                fontSize={24}
                fill="gray"
              />
            
            {/* Render drawing lines */}
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.stroke || '#000'}
                strokeWidth={line.strokeWidth || 2}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation="source-over"
              />
            ))}
            
            {/* Render objects from store */}
            {currentProject?.objects.map((obj) => {
              // Check if object should be visible at current time
              const animStart = obj.animationStart || 0;
              const animDuration = obj.animationDuration || 5;
              const animEnd = animStart + animDuration;
              const isVisible = (currentTime >= animStart && currentTime <= animEnd);
              
              if (!isVisible) return null;
              
              // Calculate animation progress (0 to 1)
              const animProgress = Math.min(Math.max((currentTime - animStart) / animDuration, 0), 1);
              
              // Apply easing function
              const getEasedProgress = (progress: number, easing: string) => {
                switch (easing) {
                  case 'easeIn':
                    return progress * progress;
                  case 'easeOut':
                    return 1 - Math.pow(1 - progress, 2);
                  case 'easeInOut':
                    return progress < 0.5 
                      ? 2 * progress * progress 
                      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                  case 'bounce':
                    if (progress < 1 / 2.75) {
                      return 7.5625 * progress * progress;
                    } else if (progress < 2 / 2.75) {
                      return 7.5625 * (progress -= 1.5 / 2.75) * progress + 0.75;
                    } else if (progress < 2.5 / 2.75) {
                      return 7.5625 * (progress -= 2.25 / 2.75) * progress + 0.9375;
                    } else {
                      return 7.5625 * (progress -= 2.625 / 2.75) * progress + 0.984375;
                    }
                  case 'linear':
                  default:
                    return progress;
                }
              };
              
              const easedProgress = getEasedProgress(animProgress, obj.animationEasing || 'easeOut');
              
              // Calculate animated properties
              let animatedProps: any = {};
              
              switch (obj.animationType) {
                case 'fadeIn':
                  animatedProps.opacity = easedProgress;
                  break;
                case 'scaleIn':
                  const scale = easedProgress;
                  animatedProps.scaleX = scale;
                  animatedProps.scaleY = scale;
                  break;
                case 'slideIn':
                  const slideOffset = (1 - easedProgress) * 100;
                  animatedProps.x = obj.x + slideOffset;
                  animatedProps.y = obj.y;
                  break;
                case 'none':
                default:
                  // No animation, use original properties
                  break;
              }
              
              if (obj.type === 'shape') {
                const props = obj.properties;
                const isSelected = selectedObject === obj.id;
                
                if (props.shapeType === 'rectangle') {
                  return (
                    <Rect
                      key={obj.id}
                      id={obj.id}
                      x={animatedProps.x !== undefined ? animatedProps.x : obj.x}
                      y={animatedProps.y !== undefined ? animatedProps.y : obj.y}
                      width={obj.width || 100}
                      height={obj.height || 100}
                      rotation={obj.rotation || 0}
                      scaleX={animatedProps.scaleX !== undefined ? animatedProps.scaleX : 1}
                      scaleY={animatedProps.scaleY !== undefined ? animatedProps.scaleY : 1}
                      opacity={animatedProps.opacity !== undefined ? animatedProps.opacity : 1}
                      fill={props.fill || 'transparent'}
                      stroke={isSelected ? '#4f46e5' : (props.stroke || '#000')}
                      strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                      draggable={tool === 'select'}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleObjectClick(obj.id, e.target);
                      }}
                      onDragEnd={(e) => handleObjectDrag(obj.id, { x: e.target.x(), y: e.target.y() })}
                      onTransformEnd={(e) => handleObjectTransform(obj.id, e.target)}
                    />
                  );
                } else if (props.shapeType === 'circle') {
                  return (
                    <Circle
                      key={obj.id}
                      id={obj.id}
                      x={(animatedProps.x !== undefined ? animatedProps.x : obj.x) + (obj.width || 100) / 2}
                      y={(animatedProps.y !== undefined ? animatedProps.y : obj.y) + (obj.height || 100) / 2}
                      radius={(obj.width || 100) / 2}
                      rotation={obj.rotation || 0}
                      scaleX={animatedProps.scaleX !== undefined ? animatedProps.scaleX : 1}
                      scaleY={animatedProps.scaleY !== undefined ? animatedProps.scaleY : 1}
                      opacity={animatedProps.opacity !== undefined ? animatedProps.opacity : 1}
                      fill={props.fill || 'transparent'}
                      stroke={isSelected ? '#4f46e5' : (props.stroke || '#000')}
                      strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                      draggable={tool === 'select'}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleObjectClick(obj.id, e.target);
                      }}
                      onDragEnd={(e) => handleObjectDrag(obj.id, { x: e.target.x() - (obj.width || 100) / 2, y: e.target.y() - (obj.height || 100) / 2 })}
                      onTransformEnd={(e) => handleObjectTransform(obj.id, e.target)}
                    />
                  );
                } else if (props.shapeType === 'triangle') {
                  const baseX = animatedProps.x !== undefined ? animatedProps.x : obj.x;
                  const baseY = animatedProps.y !== undefined ? animatedProps.y : obj.y;
                  const trianglePoints = [
                    baseX + (obj.width || 100) / 2, baseY, // top
                    baseX, baseY + (obj.height || 100), // bottom left
                    baseX + (obj.width || 100), baseY + (obj.height || 100) // bottom right
                  ];
                  return (
                    <Line
                      key={obj.id}
                      id={obj.id}
                      points={trianglePoints}
                      closed={true}
                      rotation={obj.rotation || 0}
                      scaleX={animatedProps.scaleX !== undefined ? animatedProps.scaleX : 1}
                      scaleY={animatedProps.scaleY !== undefined ? animatedProps.scaleY : 1}
                      opacity={animatedProps.opacity !== undefined ? animatedProps.opacity : 1}
                      fill={props.fill || 'transparent'}
                      stroke={isSelected ? '#4f46e5' : (props.stroke || '#000')}
                      strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                      draggable={tool === 'select'}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleObjectClick(obj.id, e.target);
                      }}
                      onDragEnd={(e) => handleObjectDrag(obj.id, { x: e.target.x(), y: e.target.y() })}
                      onTransformEnd={(e) => handleObjectTransform(obj.id, e.target)}
                    />
                  );
                } else if (props.shapeType === 'star') {
                  return (
                    <Star
                      key={obj.id}
                      id={obj.id}
                      x={(animatedProps.x !== undefined ? animatedProps.x : obj.x) + (obj.width || 100) / 2}
                      y={(animatedProps.y !== undefined ? animatedProps.y : obj.y) + (obj.height || 100) / 2}
                      numPoints={5}
                      innerRadius={(obj.width || 100) / 4}
                      outerRadius={(obj.width || 100) / 2}
                      rotation={obj.rotation || 0}
                      scaleX={animatedProps.scaleX !== undefined ? animatedProps.scaleX : 1}
                      scaleY={animatedProps.scaleY !== undefined ? animatedProps.scaleY : 1}
                      opacity={animatedProps.opacity !== undefined ? animatedProps.opacity : 1}
                      fill={props.fill || 'transparent'}
                      stroke={isSelected ? '#4f46e5' : (props.stroke || '#000')}
                      strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                      draggable={tool === 'select'}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleObjectClick(obj.id, e.target);
                      }}
                      onDragEnd={(e) => handleObjectDrag(obj.id, { x: e.target.x() - (obj.width || 100) / 2, y: e.target.y() - (obj.height || 100) / 2 })}
                      onTransformEnd={(e) => handleObjectTransform(obj.id, e.target)}
                    />
                  );
                } else if (props.shapeType === 'heart') {
                  // Heart shape using path (simplified)
                  const heartPoints = [
                    obj.x + (obj.width || 100) / 2, obj.y + (obj.height || 100) * 0.3,
                    obj.x + (obj.width || 100) * 0.8, obj.y,
                    obj.x + (obj.width || 100), obj.y + (obj.height || 100) * 0.3,
                    obj.x + (obj.width || 100) / 2, obj.y + (obj.height || 100),
                    obj.x, obj.y + (obj.height || 100) * 0.3,
                    obj.x + (obj.width || 100) * 0.2, obj.y
                  ];
                  return (
                    <Line
                      key={obj.id}
                      id={obj.id}
                      points={heartPoints}
                      closed={true}
                      rotation={obj.rotation || 0}
                      fill={props.fill || 'transparent'}
                      stroke={isSelected ? '#4f46e5' : (props.stroke || '#000')}
                      strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                      draggable={tool === 'select'}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleObjectClick(obj.id, e.target);
                      }}
                      onDragEnd={(e) => handleObjectDrag(obj.id, { x: e.target.x(), y: e.target.y() })}
                      onTransformEnd={(e) => handleObjectTransform(obj.id, e.target)}
                    />
                  );
                } else if (props.shapeType === 'arrow') {
                  return (
                    <Arrow
                      key={obj.id}
                      id={obj.id}
                      x={obj.x}
                      y={obj.y + (obj.height || 100) / 2}
                      points={[0, 0, obj.width || 100, 0]}
                      pointerLength={20}
                      pointerWidth={20}
                      rotation={obj.rotation || 0}
                      fill={props.fill || 'transparent'}
                      stroke={isSelected ? '#4f46e5' : (props.stroke || '#000')}
                      strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                      draggable={tool === 'select'}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleObjectClick(obj.id, e.target);
                      }}
                      onDragEnd={(e) => handleObjectDrag(obj.id, { x: e.target.x(), y: e.target.y() })}
                      onTransformEnd={(e) => handleObjectTransform(obj.id, e.target)}
                    />
                  );
                } else if (props.shapeType === 'polygon') {
                  return (
                    <RegularPolygon
                      key={obj.id}
                      id={obj.id}
                      x={obj.x + (obj.width || 100) / 2}
                      y={obj.y + (obj.height || 100) / 2}
                      sides={6}
                      radius={(obj.width || 100) / 2}
                      rotation={obj.rotation || 0}
                      fill={props.fill || 'transparent'}
                      stroke={isSelected ? '#4f46e5' : (props.stroke || '#000')}
                      strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
                      draggable={tool === 'select'}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleObjectClick(obj.id, e.target);
                      }}
                      onDragEnd={(e) => handleObjectDrag(obj.id, { x: e.target.x() - (obj.width || 100) / 2, y: e.target.y() - (obj.height || 100) / 2 })}
                      onTransformEnd={(e) => handleObjectTransform(obj.id, e.target)}
                    />
                  );
                }
              } else if (obj.type === 'text') {
                const isSelected = selectedObject === obj.id;
                return (
                  <Text
                    key={obj.id}
                    id={obj.id}
                    x={animatedProps.x !== undefined ? animatedProps.x : obj.x}
                    y={animatedProps.y !== undefined ? animatedProps.y : obj.y}
                    text={obj.properties.text || 'Text'}
                    fontSize={obj.properties.fontSize || 16}
                    rotation={obj.rotation || 0}
                    scaleX={animatedProps.scaleX !== undefined ? animatedProps.scaleX : 1}
                    scaleY={animatedProps.scaleY !== undefined ? animatedProps.scaleY : 1}
                    opacity={animatedProps.opacity !== undefined ? animatedProps.opacity : 1}
                    fill={isSelected ? '#4f46e5' : (obj.properties.fill || '#000')}
                    draggable={tool === 'select'}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      handleObjectClick(obj.id, e.target);
                    }}
                    onDblClick={() => handleTextDoubleClick(obj.id)}
                    onDragEnd={(e) => handleObjectDrag(obj.id, { x: e.target.x(), y: e.target.y() })}
                    onTransformEnd={(e) => handleObjectTransform(obj.id, e.target)}
                  />
                );
              } else if (obj.type === 'image') {
                const isSelected = selectedObject === obj.id;
                const assetType = obj.properties.assetType;
                
                // For emoji-based assets (hands, characters, props), render as text
                if (['hand', 'character', 'prop'].includes(assetType)) {
                  return (
                    <Text
                      key={obj.id}
                      id={obj.id}
                      x={animatedProps.x !== undefined ? animatedProps.x : obj.x}
                      y={animatedProps.y !== undefined ? animatedProps.y : obj.y}
                      text={obj.properties.src || obj.properties.alt || '❓'}
                      fontSize={Math.max((obj.width || 80) * 0.9, 24)} // Ensure minimum readable size
                      rotation={obj.rotation || 0}
                      scaleX={animatedProps.scaleX !== undefined ? animatedProps.scaleX : 1}
                      scaleY={animatedProps.scaleY !== undefined ? animatedProps.scaleY : 1}
                      opacity={animatedProps.opacity !== undefined ? animatedProps.opacity : 1}
                      fill={isSelected ? '#4f46e5' : '#000000'}
                      stroke={isSelected ? '#4f46e5' : 'transparent'}
                      strokeWidth={isSelected ? 1 : 0}
                      draggable={tool === 'select'}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleObjectClick(obj.id, e.target);
                      }}
                      onDragEnd={(e) => handleObjectDrag(obj.id, { x: e.target.x(), y: e.target.y() })}
                      onTransformEnd={(e) => handleObjectTransform(obj.id, e.target)}
                    />
                  );
                } else {
                  // For actual images, create a colored rectangle placeholder for now
                  return (
                    <Rect
                      key={obj.id}
                      id={obj.id}
                      x={obj.x}
                      y={obj.y}
                      width={obj.width || 100}
                      height={obj.height || 100}
                      rotation={obj.rotation || 0}
                      fill={isSelected ? '#e0e7ff' : '#f3f4f6'}
                      stroke={isSelected ? '#4f46e5' : '#9ca3af'}
                      strokeWidth={2}
                      draggable={tool === 'select'}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleObjectClick(obj.id, e.target);
                      }}
                      onDragEnd={(e) => handleObjectDrag(obj.id, { x: e.target.x(), y: e.target.y() })}
                      onTransformEnd={(e) => handleObjectTransform(obj.id, e.target)}
                    />
                  );
                }
              } else if (obj.type === 'drawPath') {
                const isSelected = selectedObject === obj.id;
                const points = obj.properties.points || [];
                
                // Convert points to flat array for Konva Line
                const flatPoints = points.reduce((acc: number[], point: { x: number; y: number }) => {
                  acc.push(point.x + obj.x, point.y + obj.y);
                  return acc;
                }, []);

                if (flatPoints.length > 3) {
                  return (
                    <Line
                      key={obj.id}
                      id={obj.id}
                      points={flatPoints}
                      rotation={obj.rotation || 0}
                      stroke={isSelected ? '#4f46e5' : (obj.properties.strokeColor || '#000')}
                      strokeWidth={(obj.properties.strokeWidth || 2) + (isSelected ? 1 : 0)}
                      lineCap="round"
                      lineJoin="round"
                      draggable={tool === 'select'}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handleObjectClick(obj.id, e.target);
                      }}
                      onDragEnd={(e) => handleObjectDrag(obj.id, { x: e.target.x(), y: e.target.y() })}
                      onTransformEnd={(e) => handleObjectTransform(obj.id, e.target)}
                    />
                  );
                }
              }
              return null;
            })}

            {/* Transformer for resize handles */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit resize
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          </Layer>
        </Stage>
        </div>
      </div>

      {/* Text Editing Overlay */}
      {editingText && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-2xl w-[480px] max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4 text-white">Edit Text</h3>
            <input
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded mb-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="Enter text..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTextEdit();
                if (e.key === 'Escape') cancelTextEdit();
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelTextEdit}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 border border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={saveTextEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 border border-blue-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Settings Modal */}
      <CanvasSettings 
        isOpen={showCanvasSettings}
        onClose={() => setShowCanvasSettings(false)}
      />
    </div>
  );
};

export default CanvasEditor;