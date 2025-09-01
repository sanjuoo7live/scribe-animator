import React from 'react';
import { Text } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';
import { getTypewriterText, getDrawInText } from '../utils/animationUtils';

export const TextRenderer: React.FC<BaseRendererProps> = ({
  obj,
  animatedProps,
  currentTime,
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
  const isDrawIn = obj.animationType === 'drawIn';

  // Handle typewriter and drawIn animations
  const displayText = isTypewriter
    ? getTypewriterText(
        textString,
        currentTime,
        obj.animationStart || 0,
        obj.animationDuration || 2
      )
    : isDrawIn
    ? getDrawInText(
        textString,
        currentTime,
        obj.animationStart || 0,
        obj.animationDuration || 5,
        obj.animationEasing || 'easeOut'
      )
    : textString;

  return (
    <Text
      key={obj.id}
      id={obj.id}
      x={animatedProps.x ?? obj.x}
      y={animatedProps.y ?? obj.y}
      text={displayText}
      fontSize={props.fontSize || 16}
  fontFamily={props.fontFamilyCustom || props.fontFamily || 'Arial'}
      fontStyle={props.fontStyle || 'normal'}
      textDecoration={props.textDecoration || 'none'}
      align={props.align || 'left'}
      lineHeight={props.lineHeight || 1.2}
      letterSpacing={props.letterSpacing || 0}
      width={obj.width && obj.width > 1 ? obj.width : undefined}
  rotation={animatedProps.rotation ?? obj.rotation ?? 0}
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
