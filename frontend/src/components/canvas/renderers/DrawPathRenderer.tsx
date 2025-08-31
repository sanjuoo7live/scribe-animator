import React from 'react';
import { Line, Group } from 'react-konva';
import { BaseRendererProps } from './RendererRegistry';

export const DrawPathRenderer: React.FC<BaseRendererProps> = ({
  obj,
  animatedProps,
  isSelected,
  tool,
  onClick,
  onDragEnd,
  onTransformEnd,
}) => {
  const points = obj.properties?.points || [];
  const segments = obj.properties?.segments || [];

  const pathPoints = segments.length > 0
    ? segments.flat().map((p: any) => [p.x, p.y]).flat()
    : points.map((p: any) => [p.x, p.y]).flat();

  return (
    <Group
      x={animatedProps.x ?? obj.x}
      y={animatedProps.y ?? obj.y}
      rotation={obj.rotation || 0}
      draggable={tool === 'select'}
      onClick={onClick}
      onDragEnd={(e: any) => onDragEnd(obj.id, e.currentTarget)}
      onTransformEnd={(e: any) => onTransformEnd(obj.id, e.currentTarget)}
    >
      <Line
        points={pathPoints}
        stroke={isSelected ? '#4f46e5' : (obj.properties?.stroke || '#000000')}
        strokeWidth={obj.properties?.strokeWidth || 2}
        fill={obj.properties?.fill || 'transparent'}
        tension={0.5}
        closed={obj.properties?.closed || false}
      />
    </Group>
  );
};
