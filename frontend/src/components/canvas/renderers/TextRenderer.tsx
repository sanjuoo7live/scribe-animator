import React from 'react';
import { Text } from 'react-konva';
import { BaseRendererProps } from './RendererRegistry';

export const TextRenderer: React.FC<BaseRendererProps> = ({
  obj,
  animatedProps,
  isSelected,
  tool,
  onClick,
  onDragEnd,
  onTransformEnd,
}) => {
  return (
    <Text
      x={animatedProps.x ?? obj.x}
      y={animatedProps.y ?? obj.y}
      width={animatedProps.width ?? obj.width}
      height={animatedProps.height ?? obj.height}
      text={obj.properties?.text || 'Text'}
      fontSize={obj.properties?.fontSize || 16}
      fontFamily={obj.properties?.fontFamily || 'Arial'}
      fill={obj.properties?.fill || '#000000'}
      align={obj.properties?.align || 'left'}
      verticalAlign={obj.properties?.verticalAlign || 'top'}
      rotation={obj.rotation || 0}
      draggable={tool === 'select'}
      onClick={onClick}
      onDragEnd={(e: any) => onDragEnd(obj.id, e.currentTarget)}
      onTransformEnd={(e: any) => onTransformEnd(obj.id, e.currentTarget)}
    />
  );
};
