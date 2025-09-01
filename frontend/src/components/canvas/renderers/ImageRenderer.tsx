import React from 'react';
import { Group, Text, Image as KonvaImage, Rect } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';

// Lightweight image cache hook
const useImage = (src?: string): HTMLImageElement | null => {
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);
  React.useEffect(() => {
    if (!src) { setImg(null); return; }
    const image = new window.Image();
    image.onload = () => setImg(image);
    image.onerror = () => setImg(null);
    image.src = src;
    return () => setImg(null);
  }, [src]);
  return img;
};

export const ImageRenderer: React.FC<BaseRendererProps> = ({
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
  const src: string | undefined = obj.properties?.src;
  const looksLikeImage = !!src && (src.startsWith('http') || src.includes('/api/assets') || /\.(png|jpe?g|gif|svg)$/i.test(src));

  if (!looksLikeImage) {
    // Fallback to text/emoji if src is not a URL/path
    return (
      <Text
        key={obj.id}
        id={obj.id}
        x={animatedProps.x ?? obj.x}
        y={animatedProps.y ?? obj.y}
        text={obj.properties.alt || '❓'}
        fontSize={Math.max((obj.width || 80) * 0.9, 24)}
        rotation={obj.rotation || 0}
        scaleX={animatedProps.scaleX ?? 1}
        scaleY={animatedProps.scaleY ?? 1}
        opacity={animatedProps.opacity ?? 1}
        fill={isSelected ? '#4f46e5' : '#000000'}
        stroke={isSelected ? '#4f46e5' : 'transparent'}
        strokeWidth={isSelected ? 1 : 0}
        draggable={tool === 'select'}
        onClick={(e: any) => { e.cancelBubble = true; onClick(e); }}
        onDragEnd={(e: any) => onDragEnd(obj.id, e.currentTarget)}
        onTransformEnd={(e: any) => onTransformEnd(obj.id, e.currentTarget)}
      />
    );
  }

  // Render real image using Konva.Image
  return (
    <CanvasImage
      key={obj.id}
      id={obj.id}
      obj={obj}
      animatedProps={animatedProps}
      isSelected={isSelected}
      tool={tool}
      onClick={(e: any) => onClick(e)}
      onDragEnd={(e: any) => onDragEnd(obj.id, e.currentTarget)}
      onTransformEnd={(e: any) => onTransformEnd(obj.id, e.currentTarget)}
      onDblClickImage={() => onDblClick?.(obj.id)}
    />
  );
};

// CanvasImage component (extracted from original)
const CanvasImage: React.FC<{
  id: string;
  obj: any;
  animatedProps: any;
  isSelected: boolean;
  tool: string;
  onClick: (e: any) => void;
  onDragEnd: (id: string, target: any) => void;
  onTransformEnd: (id: string, target: any) => void;
  onDblClickImage?: (id: string) => void;
}> = ({ id, obj, animatedProps, isSelected, tool, onClick, onDragEnd, onTransformEnd, onDblClickImage }) => {
  const img = useImage(obj.properties?.src);

  if (!img) {
    return (
      <Group
        x={animatedProps.x ?? obj.x}
        y={animatedProps.y ?? obj.y}
        width={obj.width || 100}
        height={obj.height || 100}
        rotation={animatedProps.rotation ?? obj.rotation ?? 0}
        scaleX={animatedProps.scaleX ?? 1}
        scaleY={animatedProps.scaleY ?? 1}
        opacity={animatedProps.opacity ?? 1}
      >
        <Text text="Loading..." fontSize={12} fill="#999" />
      </Group>
    );
  }

  return (
    <Group
      x={animatedProps.x ?? obj.x}
      y={animatedProps.y ?? obj.y}
      width={obj.width || img.width}
      height={obj.height || img.height}
  rotation={animatedProps.rotation ?? obj.rotation ?? 0}
      scaleX={animatedProps.scaleX ?? 1}
      scaleY={animatedProps.scaleY ?? 1}
      opacity={animatedProps.opacity ?? 1}
      draggable={tool === 'select'}
      onClick={(e: any) => { e.cancelBubble = true; onClick(e); }}
      onDragEnd={(e: any) => onDragEnd(id, e.currentTarget)}
      onTransformEnd={(e: any) => onTransformEnd(id, e.currentTarget)}
    >
      <KonvaImage
        image={img}
        width={obj.width || img.width}
        height={obj.height || img.height}
        onDblClick={() => onDblClickImage?.(id)}
      />
      {isSelected && (
        <Rect
          x={0}
          y={0}
          width={obj.width || img.width}
          height={obj.height || img.height}
          stroke="#4f46e5"
          strokeWidth={2}
          fill="transparent"
        />
      )}
    </Group>
  );
};
