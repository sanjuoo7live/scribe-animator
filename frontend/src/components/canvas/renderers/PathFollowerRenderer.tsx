import React from 'react';
import { Group, Circle } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';

// Minimal renderer to visualize pathFollow animation as a small dot moving along pathPoints
export const PathFollowerRenderer: React.FC<BaseRendererProps> = ({ obj, animatedProps, tool, isSelected, onClick, onDragEnd, onTransformEnd }) => {
  const radius = Math.max(3, Math.min((obj.width || 20), (obj.height || 20)) * 0.1);
  return (
    <Group
      key={obj.id}
      id={obj.id}
      x={animatedProps.x ?? obj.x}
      y={animatedProps.y ?? obj.y}
      rotation={animatedProps.rotation ?? obj.rotation ?? 0}
      opacity={animatedProps.opacity ?? 1}
      draggable={tool === 'select'}
      onClick={(e: any) => { e.cancelBubble = true; onClick(e); }}
      onDragEnd={(e: any) => onDragEnd(obj.id, e.currentTarget)}
      onTransformEnd={(e: any) => onTransformEnd(obj.id, e.currentTarget)}
    >
      <Circle radius={radius} fill={isSelected ? '#4f46e5' : obj.properties?.fill || '#000'} />
    </Group>
  );
};
