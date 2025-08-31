import React from 'react';
import { Rect, Circle, Line } from 'react-konva';
import { BaseRendererProps } from './RendererRegistry';

export const ShapeRenderer: React.FC<BaseRendererProps> = ({
  obj,
  animatedProps,
  isSelected,
  tool,
  onClick,
  onDragEnd,
  onTransformEnd,
}) => {
  const shapeProps = {
    x: animatedProps.x ?? obj.x,
    y: animatedProps.y ?? obj.y,
    width: animatedProps.width ?? obj.width,
    height: animatedProps.height ?? obj.height,
    fill: obj.properties?.fill || '#4f46e5',
    stroke: isSelected ? '#4f46e5' : (obj.properties?.stroke || '#000000'),
    strokeWidth: obj.properties?.strokeWidth || 2,
    rotation: obj.rotation || 0,
    draggable: tool === 'select',
    onClick,
    onDragEnd: (e: any) => onDragEnd(obj.id, e.currentTarget),
    onTransformEnd: (e: any) => onTransformEnd(obj.id, e.currentTarget),
  };

  const shapeType = obj.properties?.shapeType || 'rectangle';

  switch (shapeType) {
    case 'circle':
      return (
        <Circle
          {...shapeProps}
          radius={Math.min(shapeProps.width, shapeProps.height) / 2}
        />
      );
    case 'line':
      return (
        <Line
          {...shapeProps}
          points={[0, 0, shapeProps.width, shapeProps.height]}
        />
      );
    default:
      return <Rect {...shapeProps} />;
  }
};
