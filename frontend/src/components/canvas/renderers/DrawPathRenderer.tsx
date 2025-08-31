import React from 'react';
import { Group, Line, Rect, Image as KonvaImage } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';
import { useAppStore } from '../../../store/appStore';

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
  isSelected,
  tool,
  onClick,
  onDragEnd,
  onTransformEnd,
}) => {
  const { currentTime } = useAppStore();

  // Calculate animation progress like the original CanvasEditor
  const animStart = obj.animationStart || 0;
  const animDuration = obj.animationDuration || 5;
  const elapsed = Math.min(Math.max(currentTime - animStart, 0), animDuration);
  const progress = animDuration > 0 ? elapsed / animDuration : 1;

  // Apply easing like the original
  const easing = obj.animationEasing || 'easeOut';
  const ease = (p: number) => {
    switch (easing) {
      case 'easeIn': return p * p;
      case 'easeOut': return 1 - Math.pow(1 - p, 2);
      case 'easeInOut': return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      default: return p;
    }
  };
  const ep = ease(progress);

  const assetSrc = obj.properties.assetSrc;
  const hasSegments = Array.isArray(obj.properties?.segments) && obj.properties.segments.length > 0;
  const segments: { x: number; y: number }[][] = hasSegments
    ? obj.properties.segments
    : [obj.properties.points || []];

  // Compute total points for animation timing
  const totalPoints = segments.reduce((sum, seg) => sum + seg.length, 0);

  // Determine how many points should be visible globally based on time-driven progress
  const globalReveal = obj.animationType === 'drawIn' && totalPoints > 1
    ? Math.max(1, Math.floor(ep * totalPoints + 0.00001))
    : totalPoints;

  // Build per-segment revealed points
  let remaining = globalReveal;
  const revealedSegments = segments.map((seg) => {
    if (remaining <= 0) return seg.slice(0, 0);
    const take = Math.min(seg.length, remaining);
    remaining -= take;
    return seg.slice(0, Math.max(1, take));
  });

  // Current head for tool follower
  let head: { x: number; y: number } | undefined;
  for (let i = revealedSegments.length - 1; i >= 0 && !head; i--) {
    const seg = revealedSegments[i];
    if (seg.length > 0) head = seg[seg.length - 1];
  }
  const prev = head && (() => {
    for (let i = revealedSegments.length - 1; i >= 0; i--) {
      const seg = revealedSegments[i];
      if (seg.length > 1) return seg[seg.length - 2];
    }
    return head;
  })();
  const dx = (head?.x ?? 0) - (prev?.x ?? 0);
  const dy = (head?.y ?? 0) - (prev?.y ?? 0);
  const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;

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
      opacity={(animatedProps.opacity ?? 1) * (obj.properties.opacity ?? 1)}
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
