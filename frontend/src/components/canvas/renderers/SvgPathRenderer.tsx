import React from 'react';
import { Group, Shape, Rect } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';
import { useAppStore } from '../../../store/appStore';

// SVG Path Renderer component
export const SvgPathRenderer: React.FC<BaseRendererProps> = ({
  obj,
  animatedProps,
  isSelected,
  tool,
  onClick,
  onDragEnd,
  onDragMove,
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

  const groupX = animatedProps.x ?? obj.x;
  const groupY = animatedProps.y ?? obj.y;
  const paths = Array.isArray(obj.properties?.paths) ? obj.properties.paths : [];
  const totalLen = obj.properties?.totalLen || 0;
  const draw = obj.animationType === 'drawIn';

  // Reveal length is tied to object's duration so timeline edits directly influence drawing speed
  const targetLen = draw ? ep * totalLen : totalLen;
  let consumed = 0;

  return (
    <Group
      key={obj.id}
      id={obj.id}
      name={`svg-path-${obj.id}`}
      x={groupX}
      y={groupY}
      rotation={obj.rotation || 0}
      scaleX={(obj.properties?.scaleX ?? 1) * (animatedProps.scaleX ?? 1)}
      scaleY={(obj.properties?.scaleY ?? 1) * (animatedProps.scaleY ?? 1)}
      opacity={animatedProps.opacity ?? 1}
      // Bind custom attrs directly so react-konva updates node on time changes
      __progress={ep}
      __totalLen={totalLen}
      __targetLen={targetLen}
      draggable={tool === 'select'}
      listening={true}
      onClick={(e: any) => { 
        e.cancelBubble = true; 
        // Try to set the ID on the event target for reliable detection
        if (e.currentTarget && !e.currentTarget.id?.()) {
          e.currentTarget.id(obj.id);
        }
        onClick(e); 
      }}
      onTap={(e: any) => { 
        e.cancelBubble = true; 
        // Try to set the ID on the event target for reliable detection
        if (e.currentTarget && !e.currentTarget.id?.()) {
          e.currentTarget.id(obj.id);
        }
        onClick(e); 
      }}
      onDragEnd={(e) => {
        onDragEnd(obj.id, e.currentTarget);
      }}
      onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
    >
      {/* Invisible background to make the group clickable */}
      <Rect
        x={0}
        y={0}
        width={obj.width || 100}
        height={obj.height || 100}
        fill="transparent"
        listening={true}
        onClick={(e: any) => {
          e.cancelBubble = true;
          // Try to set the ID on the event target for reliable detection
          if (e.currentTarget && !e.currentTarget.id?.()) {
            e.currentTarget.id(obj.id);
          }
          onClick(e);
        }}
        onTap={(e: any) => {
          e.cancelBubble = true;
          // Try to set the ID on the event target for reliable detection
          if (e.currentTarget && !e.currentTarget.id?.()) {
            e.currentTarget.id(obj.id);
          }
          onClick(e);
        }}
      />
      {paths.map((p: any, idx: number) => {
        const d = p.d as string;
        const len = p.len || 0;
        const wantFill = !!(p.fill && p.fill !== 'none' && p.fill !== 'transparent');
        let dash: number[] | undefined;
        let dashOffset = 0;
        let fillColor: string | undefined = wantFill ? 'transparent' : undefined;
        // Prefer selection color; otherwise prefer path stroke; during drawIn, use a visible preview color
        const baseStroke = (p.stroke && p.stroke !== 'none') ? p.stroke : '#111827';
        let strokeColor: string = isSelected ? '#4f46e5' : baseStroke;
        if (draw && progress < 1) {
          strokeColor = '#3b82f6'; // Blue preview color during drawIn
        }

        if (draw && len > 0 && totalLen > 0) {
          const start = consumed;
          const end = consumed + len;
          if (targetLen <= start) {
            // Not started: ensure nothing is visible for this path yet
            dash = undefined;
            dashOffset = 0;
            strokeColor = 'transparent';
          } else if (targetLen >= end) {
            // This path fully revealed; only allow fill when the entire object is complete
            dash = undefined;
            dashOffset = 0;
            fillColor = wantFill && progress >= 1 ? (p.fill as string) : (wantFill ? 'transparent' : undefined);
          } else {
            // in progress
            const localReveal = Math.max(0, Math.min(len, targetLen - start));
            // Draw only the first localReveal portion visibly
            dash = [Math.max(0.001, localReveal), len];
            dashOffset = 0;
          }
        } else {
          // no animation: show full with fill
          dash = undefined;
          dashOffset = 0;
          fillColor = wantFill ? (p.fill as string) : undefined;
        }
        consumed += len;

        const matrix = p.m as number[] | undefined;
        return (
          <Shape
            key={`${obj.id}-p-${idx}-${progress}-${isSelected}`}
            sceneFunc={(ctx, shape) => {
              ctx.save();
              if (matrix) ctx.transform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
              const path = new Path2D(d);
              // Slightly thicken during draw to improve visibility
              ctx.lineWidth = (p.strokeWidth ?? 3) + (isSelected ? 0.5 : 0) + (draw ? 1 : 0);
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.strokeStyle = strokeColor;
              if (dash) ctx.setLineDash(dash);
              ctx.lineDashOffset = dashOffset;
              ctx.stroke(path);
              if (fillColor) {
                ctx.fillStyle = fillColor;
                if (p.fillRule) ctx.fill(path, p.fillRule);
                else ctx.fill(path);
              }
              ctx.restore();
            }}
            // Bind custom attrs directly to force updates when these values change
            __progress={progress}
            __targetLen={targetLen}
            __dashOffset={dashOffset}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      })}
    </Group>
  );
};
