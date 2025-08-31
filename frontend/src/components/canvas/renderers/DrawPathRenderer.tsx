import React from 'react';
import { Group, Line, Rect, Image as KonvaImage } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';
import { calculateAnimationProgress, getDrawPathSegments, getDrawPathHead, calculateToolAngle } from '../utils/animationUtils';

// Tool follower component to render pen/hand images with rotation
const ToolFollower: React.FC<{
  x: number;
  y: number;
  angle: number;
  penType?: string;
  handAsset?: string;
  handOffset?: { x: number; y: number };
  handScale?: number;
  penOffset?: { x: number; y: number };
  penScale?: number;
}> = ({ x, y, angle, penType = 'pen', handAsset, handOffset, handScale = 1, penOffset, penScale = 1 }) => {
  // Helper functions for pen and hand assets (image paths)
  const getPenAsset = (penType: string): string => {
    switch (penType) {
      case 'pencil': return '/assets/tools/pencil.svg';
      case 'marker': return '/assets/tools/marker.svg';
      case 'brush': return '/assets/tools/brush.svg';
      default: return '/assets/tools/pen.svg';
    }
  };

  const getHandAsset = (handAsset: string | undefined): string | null => {
    if (!handAsset || handAsset === 'none') return null;
    const map: Record<string, string> = {
      'right-light': '/assets/tools/hand-right-light.svg',
      'right-medium': '/assets/tools/hand-right-medium.svg',
      'right-dark': '/assets/tools/hand-right-dark.svg',
      'left-light': '/assets/tools/hand-left-light.svg',
      'left-medium': '/assets/tools/hand-left-medium.svg',
      'left-dark': '/assets/tools/hand-left-dark.svg',
    };
    // fallback to right-light
    const key = handAsset in map ? handAsset : 'right-light';
    return map[key];
  };

  // lightweight image cache hook
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

  const penImg = useImage(getPenAsset(penType));
  const handPath = getHandAsset(handAsset || undefined) || undefined;
  const handImg = useImage(handPath);

  return (
    <>
      {penImg && (
        <KonvaImage
          image={penImg}
          x={x + (penOffset?.x || 0)}
          y={y + (penOffset?.y || 0)}
          width={32 * penScale}
          height={32 * penScale}
          offsetX={(16) * penScale}
          offsetY={(24) * penScale}
          rotation={angle}
        />
      )}
      {handImg && (
        <KonvaImage
          image={handImg}
          x={x + (handOffset?.x ?? 16)}
          y={y + (handOffset?.y ?? 8)}
          width={40 * handScale}
          height={40 * handScale}
          offsetX={(20) * handScale}
          offsetY={(20) * handScale}
          rotation={angle}
        />
      )}
    </>
  );
};

export const DrawPathRenderer: React.FC<BaseRendererProps> = ({
  obj,
  animatedProps,
  currentTime,
  isSelected,
  tool,
  onClick,
  onDragEnd,
  onTransformEnd,
}) => {

  // Calculate animation progress using utility function
  const progress = calculateAnimationProgress(
    currentTime,
    obj.animationStart || 0,
    obj.animationDuration || 5,
    obj.animationEasing || 'easeOut'
  );

  const assetSrc = obj.properties.assetSrc;
  const hasSegments = Array.isArray(obj.properties?.segments) && obj.properties.segments.length > 0;
  const segments: { x: number; y: number }[][] = hasSegments
    ? obj.properties.segments
    : [obj.properties.points || []];

  // Use animation utility for drawIn animation
  const revealedSegments = obj.animationType === 'drawIn'
    ? getDrawPathSegments(segments, progress)
    : segments;

  // Current head for tool follower using utility
  const head = obj.animationType === 'drawIn' ? getDrawPathHead(revealedSegments) : null;
  // Calculate tool angle using utility
  const prev = head && (() => {
    for (let i = revealedSegments.length - 1; i >= 0; i--) {
      const seg = revealedSegments[i];
      if (seg.length > 1) return seg[seg.length - 2];
    }
    return head;
  })();
  const angleDeg = head && prev ? calculateToolAngle(head, prev) : 0;

  // Helper to render segments as Lines
  const renderSegmentLines = (segList: { x: number; y: number }[][], opts: { stroke: string; strokeWidth: number; composite?: string; }) => (
    segList.map((seg, si) => {
      if (seg.length < 2) return null;
      const flat = seg.reduce((acc: number[], p) => acc.concat([p.x, p.y]), [] as number[]);
      return (
        <Line
          key={`${obj.id}-seg-${si}`}
          points={flat}
          stroke={opts.stroke}
          strokeWidth={opts.strokeWidth}
          lineCap="round"
          lineJoin="round"
          perfectDrawEnabled={false}
          globalCompositeOperation={opts.composite as any}
          opacity={obj.properties?.opacity ?? 1}
          dash={obj.properties?.dash}
          listening={tool === 'select'}
          hitStrokeWidth={20}
        />
      );
    })
  );

  // Compute total points for asset rendering
  const totalPoints = segments.reduce((sum, seg) => sum + seg.length, 0);

  // If there's a background asset, create a masked reveal effect
  if (assetSrc && totalPoints > 1) {
    return (
      <Group
        key={obj.id}
        id={obj.id}
        x={animatedProps.x ?? obj.x}
        y={animatedProps.y ?? obj.y}
        rotation={obj.rotation || 0}
        scaleX={animatedProps.scaleX ?? 1}
        scaleY={animatedProps.scaleY ?? 1}
        opacity={animatedProps.opacity ?? 1}
        draggable={tool === 'select'}
        listening={tool === 'select'}
        onClick={(e) => { e.cancelBubble = true; onClick(e); }}
        onDragEnd={(e) => onDragEnd(obj.id, e.currentTarget)}
        onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
        clipX={0}
        clipY={0}
        clipWidth={Math.max(1, obj.width || 1)}
        clipHeight={Math.max(1, obj.height || 1)}
      >
        <Rect
          x={0}
          y={0}
          width={Math.max(1, obj.width || 1)}
          height={Math.max(1, obj.height || 1)}
          fill="rgba(0,0,0,0.01)"
          listening={tool === 'select'}
        />
        {/* Placeholder for masked image - would need ImageRenderer integration */}
        <Rect
          x={0}
          y={0}
          width={Math.max(1, obj.width || 1)}
          height={Math.max(1, obj.height || 1)}
          fill="rgba(200,200,200,0.5)"
          listening={false}
        />
        {/* Mask segments */}
        {renderSegmentLines(revealedSegments, { stroke: 'white', strokeWidth: (obj.properties.strokeWidth || 2) * 3, composite: 'destination-in' })}
        {/* Tool follower for drawPath */}
        {(() => {
          if (!(obj.animationType === 'drawIn' && head && prev && progress < 1)) return null;
          return (
            <ToolFollower
              x={head.x}
              y={head.y}
              angle={angleDeg}
              penType={obj.properties?.selectedPenType}
              handAsset={obj.properties?.selectedHandAsset}
              handOffset={obj.properties?.handOffset}
              handScale={obj.properties?.handScale}
              penOffset={obj.properties?.penOffset}
              penScale={obj.properties?.penScale}
            />
          );
        })()}
      </Group>
    );
  }

  // Fallback: render as regular lines
  const groupX = animatedProps.x ?? obj.x;
  const groupY = animatedProps.y ?? obj.y;
  return (
    <Group
      key={obj.id}
      id={obj.id}
      x={groupX}
      y={groupY}
      width={obj.width || 100}
      height={obj.height || 100}
      rotation={obj.rotation || 0}
      opacity={animatedProps.opacity ?? 1}
      draggable={tool === 'select'}
      listening={tool === 'select'}
      onClick={(e) => { e.cancelBubble = true; onClick(e); }}
      onDragEnd={(e) => onDragEnd(obj.id, e.currentTarget)}
      onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
    >
      <Rect
        x={0}
        y={0}
        width={Math.max(1, obj.width || 1)}
        height={Math.max(1, obj.height || 1)}
        fill="rgba(0,0,0,0.01)"
        listening={tool === 'select'}
      />
      {renderSegmentLines(revealedSegments, { 
        stroke: isSelected ? '#4f46e5' : (obj.properties.strokeColor || '#000'), 
        strokeWidth: (obj.properties.strokeWidth || 2) + (isSelected ? 1 : 0),
        composite: obj.properties?.composite
      })}
      {/* Tool follower for drawPath */}
      {(() => {
        if (!(obj.animationType === 'drawIn' && head && prev && progress < 1)) return null;
        return (
          <ToolFollower
            x={head.x}
            y={head.y}
            angle={angleDeg}
            penType={obj.properties?.selectedPenType}
            handAsset={obj.properties?.selectedHandAsset}
            handOffset={obj.properties?.handOffset}
            handScale={obj.properties?.handScale}
            penOffset={obj.properties?.penOffset}
            penScale={obj.properties?.penScale}
          />
        );
      })()}
    </Group>
  );
};
