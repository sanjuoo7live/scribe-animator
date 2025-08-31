import React from 'react';
import { Group, Rect, Circle, Star, RegularPolygon, Arrow, Line } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';

export const ShapeRenderer: React.FC<BaseRendererProps> = ({
  obj,
  animatedProps,
  isSelected,
  tool,
  onClick,
  onDragEnd,
  onTransformEnd,
}) => {
  const props = obj.properties;

  // Rectangle
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
        onClick={(e) => { e.cancelBubble = true; onClick(e); }}
        onDragEnd={(e) => onDragEnd(obj.id, e.currentTarget)}
        onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
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
        width={w}
        height={h}
        rotation={obj.rotation || 0}
        scaleX={animatedProps.scaleX ?? 1}
        scaleY={animatedProps.scaleY ?? 1}
        opacity={animatedProps.opacity ?? 1}
        draggable={tool === 'select'}
        onClick={(e) => { e.cancelBubble = true; onClick(e); }}
        onDragEnd={(e) => onDragEnd(obj.id, e.currentTarget)}
        onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
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

  // Star
  if (props.shapeType === 'star') {
    return (
      <Star
        key={obj.id}
        id={obj.id}
        x={animatedProps.x ?? obj.x}
        y={animatedProps.y ?? obj.y}
        numPoints={5}
        innerRadius={(obj.width || 100) * 0.4}
        outerRadius={(obj.width || 100) * 0.5}
        rotation={obj.rotation || 0}
        scaleX={animatedProps.scaleX ?? 1}
        scaleY={animatedProps.scaleY ?? 1}
        opacity={animatedProps.opacity ?? 1}
        fill={props.fill || 'transparent'}
        stroke={isSelected ? '#4f46e5' : props.stroke || '#000'}
        strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
        draggable={tool === 'select'}
        onClick={(e) => { e.cancelBubble = true; onClick(e); }}
        onDragEnd={(e) => onDragEnd(obj.id, e.currentTarget)}
        onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
      />
    );
  }

  // Regular Polygon
  if (props.shapeType === 'polygon') {
    return (
      <RegularPolygon
        key={obj.id}
        id={obj.id}
        x={animatedProps.x ?? obj.x}
        y={animatedProps.y ?? obj.y}
        sides={props.sides || 6}
        radius={(obj.width || 100) * 0.5}
        rotation={obj.rotation || 0}
        scaleX={animatedProps.scaleX ?? 1}
        scaleY={animatedProps.scaleY ?? 1}
        opacity={animatedProps.opacity ?? 1}
        fill={props.fill || 'transparent'}
        stroke={isSelected ? '#4f46e5' : props.stroke || '#000'}
        strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
        draggable={tool === 'select'}
        onClick={(e) => { e.cancelBubble = true; onClick(e); }}
        onDragEnd={(e) => onDragEnd(obj.id, e.currentTarget)}
        onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
      />
    );
  }

  // Arrow
  if (props.shapeType === 'arrow') {
    return (
      <Arrow
        key={obj.id}
        id={obj.id}
        x={animatedProps.x ?? obj.x}
        y={animatedProps.y ?? obj.y}
        points={[0, 0, (obj.width || 100), (obj.height || 100) * 0.5, 0, (obj.height || 100)]}
        rotation={obj.rotation || 0}
        scaleX={animatedProps.scaleX ?? 1}
        scaleY={animatedProps.scaleY ?? 1}
        opacity={animatedProps.opacity ?? 1}
        fill={props.fill || 'transparent'}
        stroke={isSelected ? '#4f46e5' : props.stroke || '#000'}
        strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
        draggable={tool === 'select'}
        onClick={(e) => { e.cancelBubble = true; onClick(e); }}
        onDragEnd={(e) => onDragEnd(obj.id, e.currentTarget)}
        onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
      />
    );
  }

  // Line
  if (props.shapeType === 'line') {
    return (
      <Line
        key={obj.id}
        id={obj.id}
        x={animatedProps.x ?? obj.x}
        y={animatedProps.y ?? obj.y}
        points={[0, 0, (obj.width || 100), (obj.height || 100)]}
        rotation={obj.rotation || 0}
        scaleX={animatedProps.scaleX ?? 1}
        scaleY={animatedProps.scaleY ?? 1}
        opacity={animatedProps.opacity ?? 1}
        stroke={isSelected ? '#4f46e5' : props.stroke || '#000'}
        strokeWidth={(props.strokeWidth || 2) + (isSelected ? 1 : 0)}
        draggable={tool === 'select'}
        onClick={(e) => { e.cancelBubble = true; onClick(e); }}
        onDragEnd={(e) => onDragEnd(obj.id, e.currentTarget)}
        onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
      />
    );
  }

  // Default fallback
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
      onClick={(e) => { e.cancelBubble = true; onClick(e); }}
      onDragEnd={(e) => onDragEnd(obj.id, e.currentTarget)}
      onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
    />
  );
};
