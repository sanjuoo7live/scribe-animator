import React from 'react';
import { Image } from 'react-konva';
import { BaseRendererProps } from './RendererRegistry';

export const ImageRenderer: React.FC<BaseRendererProps> = ({
  obj,
  animatedProps,
  isSelected,
  tool,
  onClick,
  onDragEnd,
  onTransformEnd,
}) => {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    if (obj.properties?.src) {
      const img = new window.Image();
      img.src = obj.properties.src;
      img.onload = () => setImage(img);
    }
  }, [obj.properties?.src]);

  if (!image) {
    return (
      <Image
        x={animatedProps.x ?? obj.x}
        y={animatedProps.y ?? obj.y}
        width={animatedProps.width ?? obj.width}
        height={animatedProps.height ?? obj.height}
        fill="#f0f0f0"
        stroke={isSelected ? '#4f46e5' : '#cccccc'}
        strokeWidth={2}
        rotation={obj.rotation || 0}
        draggable={tool === 'select'}
        onClick={onClick}
        onDragEnd={(e: any) => onDragEnd(obj.id, e.currentTarget)}
        onTransformEnd={(e: any) => onTransformEnd(obj.id, e.currentTarget)}
        image={undefined}
      />
    );
  }

  return (
    <Image
      image={image}
      x={animatedProps.x ?? obj.x}
      y={animatedProps.y ?? obj.y}
      width={animatedProps.width ?? obj.width}
      height={animatedProps.height ?? obj.height}
      rotation={obj.rotation || 0}
      draggable={tool === 'select'}
      onClick={onClick}
      onDragEnd={(e: any) => onDragEnd(obj.id, e.currentTarget)}
      onTransformEnd={(e: any) => onTransformEnd(obj.id, e.currentTarget)}
    />
  );
};
