import React from 'react';
import { Group, Line, Rect, Text } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';
import { useCanvasContext } from '../CanvasContext';

// Debug component to test drawPath animation
export const DrawPathRendererDebug: React.FC<BaseRendererProps> = ({
  obj,
  animatedProps,
  isSelected,
  tool,
  onClick,
  onDragEnd,
  onTransformEnd,
}) => {
  const { clock } = useCanvasContext();
  const currentTime = clock.getTime();

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
          listening={tool === 'select'}
          hitStrokeWidth={20}
        />
      );
    })
  );

  const groupX = animatedProps.x ?? obj.x;
  const groupY = animatedProps.y ?? obj.y;

  return (
    <Group
      key={obj.id}
      id={obj.id}
      x={groupX}
      y={groupY}
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

      {/* Debug info */}
      <Text
        x={10}
        y={10}
        text={`Time: ${currentTime.toFixed(2)}s`}
        fontSize={12}
        fill="#ff0000"
      />
      <Text
        x={10}
        y={25}
        text={`Progress: ${(progress * 100).toFixed(1)}%`}
        fontSize={12}
        fill="#ff0000"
      />
      <Text
        x={10}
        y={40}
        text={`Eased: ${(ep * 100).toFixed(1)}%`}
        fontSize={12}
        fill="#ff0000"
      />
      <Text
        x={10}
        y={55}
        text={`Reveal: ${globalReveal}/${totalPoints}`}
        fontSize={12}
        fill="#ff0000"
      />
      <Text
        x={10}
        y={70}
        text={`Type: ${obj.animationType}`}
        fontSize={12}
        fill="#ff0000"
      />

      {renderSegmentLines(revealedSegments, { stroke: isSelected ? '#4f46e5' : (obj.properties.strokeColor || '#000'), strokeWidth: (obj.properties.strokeWidth || 2) + (isSelected ? 1 : 0) })}
    </Group>
  );
};
