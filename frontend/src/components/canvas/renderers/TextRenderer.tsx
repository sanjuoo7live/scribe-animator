import React from 'react';
import { Text } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';

export const TextRenderer: React.FC<BaseRendererProps> = ({
  obj,
  animatedProps,
  isSelected,
  tool,
  onClick,
  onDragEnd,
  onTransformEnd,
  onDblClick,
}) => {
  const props = obj.properties;
  const textString: string = props.text || 'Text';
  const isTypewriter = obj.animationType === 'typewriter';

  if (!isTypewriter) {
    return (
      <Text
        key={obj.id}
        id={obj.id}
        x={animatedProps.x ?? obj.x}
        y={animatedProps.y ?? obj.y}
        text={textString}
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
        onClick={(e) => { e.cancelBubble = true; onClick(e); }}
        onDblClick={() => onDblClick?.(obj.id)}
        onDragEnd={(e) => onDragEnd(obj.id, e.currentTarget)}
        onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
      />
    );
  }

  // Typewriter animation - this will need access to current time
  // For now, render full text
  return (
    <Text
      key={obj.id}
      id={obj.id}
      x={animatedProps.x ?? obj.x}
      y={animatedProps.y ?? obj.y}
      text={textString}
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
      onClick={(e) => { e.cancelBubble = true; onClick(e); }}
      onDblClick={() => onDblClick?.(obj.id)}
      onDragEnd={(e) => onDragEnd(obj.id, e.currentTarget)}
      onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
    />
  );
};
