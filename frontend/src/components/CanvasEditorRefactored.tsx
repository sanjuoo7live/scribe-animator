import React, { useCallback, useRef, useEffect } from 'react';
import { Stage, Layer, Transformer, Group, Rect } from 'react-konva';
import Konva from 'konva';
import { useAppStore } from '../store/appStore';
import { rendererRegistry } from './canvas/renderers/RendererRegistry';

export const CanvasEditorRefactored: React.FC = () => {
  const {
    currentProject,
    updateObject,
    selectedObject,
    selectObject,
  } = useAppStore();

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Handle object selection
  const handleObjectClick = useCallback((id: string) => {
    selectObject(id);
  }, [selectObject]);

  // Handle object drag
  const handleObjectDrag = useCallback((id: string, node: any) => {
    updateObject(id, {
      x: node.x(),
      y: node.y(),
    });
  }, [updateObject]);

  // Handle object transform
  const handleObjectTransform = useCallback((id: string, node: any) => {
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
      const baseFont = obj.properties?.fontSize || 16;
      const newFont = Math.max(8, baseFont * scaleY);
      const ox = typeof node.offsetX === 'function' ? node.offsetX() : node.offsetX || 0;
      const oy = typeof node.offsetY === 'function' ? node.offsetY() : node.offsetY || 0;
      updateObject(id, {
        x: nx - ox,
        y: ny - oy,
        width: Math.max(20, newWidth),
        height: obj.height,
        rotation,
        properties: { ...obj.properties, fontSize: newFont },
      });
    } else if (obj && obj.type === 'svgPath') {
      const ox = typeof node.offsetX === 'function' ? node.offsetX() : node.offsetX || 0;
      const oy = typeof node.offsetY === 'function' ? node.offsetY() : node.offsetY || 0;
      updateObject(id, {
        x: nx - ox,
        y: ny - oy,
        width: newWidth,
        height: newHeight,
        rotation,
        properties: { ...obj.properties, scaleX, scaleY },
      });
    } else {
      const ox = typeof node.offsetX === 'function' ? node.offsetX() : node.offsetX || 0;
      const oy = typeof node.offsetY === 'function' ? node.offsetY() : node.offsetY || 0;
      updateObject(id, { x: nx - ox, y: ny - oy, width: newWidth, height: newHeight, rotation });
    }

    if (typeof node.scaleX === 'function') {
      node.scaleX(1);
      node.scaleY(1);
    }
  }, [currentProject, updateObject]);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && selectedObject) {
      const node = stageRef.current?.findOne(`#${selectedObject}`);
      if (node) {
        transformerRef.current.nodes([node]);
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedObject]);

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No project loaded</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <Stage
        ref={stageRef}
        width={currentProject.width}
        height={currentProject.height}
        onClick={() => selectObject(null)}
      >
        <Layer>
          {/* Render background */}
          <Group>
            <Rect
              width={currentProject.width}
              height={currentProject.height}
              fill={currentProject.backgroundColor || '#ffffff'}
            />
          </Group>

          {/* Render objects using modular renderer system */}
          {currentProject.objects.map((obj) => {
            const Renderer = rendererRegistry.get(obj.type);
            if (!Renderer) return null;

            return (
              <Renderer
                key={obj.id}
                obj={obj}
                animatedProps={{}}
                isSelected={selectedObject === obj.id}
                tool="select"
                onClick={() => handleObjectClick(obj.id)}
                onDragEnd={(id, node) => handleObjectDrag(id, node)}
                onTransformEnd={(id, node) => handleObjectTransform(id, node)}
              />
            );
          })}

          {/* Transformer for selected objects */}
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
  );
};

export default CanvasEditorRefactored;
