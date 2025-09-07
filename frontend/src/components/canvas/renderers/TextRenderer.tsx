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

  // Build font family stack with robust emoji fallbacks
  const containsEmoji = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      const cp = s.codePointAt(i) ?? 0;
      // If code point is above BMP, advance index extra
      if (cp > 0xffff) i++;
      if (
        (cp >= 0x1f300 && cp <= 0x1faff) ||
        (cp >= 0x1f900 && cp <= 0x1f9ff) ||
        (cp >= 0x2600 && cp <= 0x27bf)
      ) {
        return true;
      }
    }
    return false;
  };
  const fontStack = (() => {
    const base = props.fontFamily || 'Arial';
    const custom = props.fontFamilyCustom?.trim();
    const emojiFallback = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Twemoji Mozilla','EmojiOne Color','Segoe UI Symbol'";
    const preferEmoji = !!props.forceEmojiFont || containsEmoji(textString);
    if (preferEmoji) {
      // Prioritize emoji fonts then base/custom
      return `${emojiFallback}, ${custom ? custom + ', ' : ''}${base}`;
    }
    return `${custom ? custom + ', ' : ''}${base}, ${emojiFallback}`;
  })();

  return (
    <Text
      key={obj.id}
      id={obj.id}
      x={animatedProps.x ?? obj.x}
      y={animatedProps.y ?? obj.y}
      text={displayText}
      fontSize={props.fontSize || 16}
      fontFamily={fontStack}
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
      fill={props.fill || '#000'}
      stroke={isSelected ? '#4f46e5' : (props.strokeWidth > 0 ? props.stroke || '#000' : undefined)}
      strokeWidth={isSelected ? 1 : (props.strokeWidth || 0)}
      dash={isSelected ? [4, 4] : undefined}
      draggable={tool === 'select'}
      onClick={(e) => { e.cancelBubble = true; onClick(e); }}
      onDblClick={() => onDblClick?.(obj.id)}
      onDragEnd={(e) => onDragEnd(obj.id, e.currentTarget)}
      onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
    />
  );
};
