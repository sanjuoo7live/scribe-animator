import React from 'react';
import { Group, Shape, Rect } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';
import { calculateAnimationProgress } from '../utils/animationUtils';
import { HandFollower } from '../../hands/HandFollower';
import ThreeLayerHandFollower from '../../hands/ThreeLayerHandFollower';
import { HandAssetManager } from '../../hands/HandAssetManager';

// SVG Path Renderer component
export const SvgPathRenderer: React.FC<BaseRendererProps> = ({
  obj,
  animatedProps,
  currentTime,
  isSelected,
  tool,
  onClick,
  onDragEnd,
  onDragMove,
  onTransformEnd,
}) => {

  // Calculate animation progress using utility function
  const progress = calculateAnimationProgress(
    currentTime,
    obj.animationStart || 0,
    obj.animationDuration || 5,
    obj.animationEasing || 'easeOut'
  );

  const groupX = animatedProps.x ?? obj.x;
  const groupY = animatedProps.y ?? obj.y;
  
  // Memoize paths to prevent hand follower from recalculating on every render
  const paths = React.useMemo(() => {
    return Array.isArray(obj.properties?.paths) ? obj.properties.paths : [];
  }, [obj.properties?.paths]);
  
  const totalLen = obj.properties?.totalLen || 0;
  const draw = obj.animationType === 'drawIn';
  const previewMode = !!obj.properties?.previewDraw;
  const drawOptions = obj.properties?.drawOptions || null;
  const fillKind: 'afterAll' | 'perPath' | 'batched' = drawOptions?.fillStrategy?.kind
    || (previewMode ? 'perPath' : 'afterAll');
  const batchesN = Math.max(2, Number(drawOptions?.fillStrategy?.batchesN || 4));
  const previewStrokeColor = drawOptions?.previewStroke?.color || '#3b82f6';
  const previewWidthBoost = typeof drawOptions?.previewStroke?.widthBoost === 'number' ? drawOptions.previewStroke.widthBoost : 1;

  // Reveal length is tied to object's duration so timeline edits directly influence drawing speed
  const targetLen = draw ? progress * totalLen : totalLen;
  // Batched fill threshold (ensure last batch fills when complete)
  const fraction = totalLen > 0 ? targetLen / totalLen : 1;
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  const filledBatches = totalLen > 0 ? Math.floor(clampedFraction * batchesN + 1e-9) : 0; // 0..batchesN
  const batchThreshold = (fillKind === 'batched' && totalLen > 0)
    ? (Math.min(filledBatches, batchesN) / batchesN) * totalLen
    : totalLen;
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
  opacity={obj.type === 'svgPath' ? 1 : (animatedProps.opacity ?? 1)}
      // Bind custom attrs directly so react-konva updates node on time changes
      __progress={progress}
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
        // Prefer selection color; otherwise prefer path stroke; during drawIn, optionally use a visible preview color
        const baseStroke = (p.stroke && p.stroke !== 'none') ? p.stroke : '#111827';
        let strokeColor: string = isSelected ? '#4f46e5' : baseStroke;
        if (draw && progress < 1 && !previewMode) {
          strokeColor = previewStrokeColor; // Preview color during drawIn (suppressed in preview mode)
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
            // This path fully revealed
            dash = undefined;
            dashOffset = 0;
            // Fill policy
            if (wantFill) {
              if (fillKind === 'perPath') {
                fillColor = p.fill as string;
              } else if (fillKind === 'batched') {
                // Only fill if the path end lies within the current batch threshold
                const endPos = end;
                const EPS = 1e-6;
                fillColor = endPos <= (batchThreshold + EPS) ? (p.fill as string) : 'transparent';
              } else {
                // afterAll
                fillColor = progress >= 1 ? (p.fill as string) : 'transparent';
              }
            } else {
              fillColor = undefined;
            }
          } else {
            // in progress
            const localReveal = Math.max(0, Math.min(len, targetLen - start));
            // Draw only the first localReveal portion visibly
            dash = [Math.max(0.001, localReveal), len];
            dashOffset = 0;
            // If original path had no stroke, use a visible fallback during drawing
            const hadStroke = !!(p.stroke && p.stroke !== 'none' && p.stroke !== 'transparent');
            if (!hadStroke) {
              strokeColor = previewStrokeColor;
            }
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
              // Slightly thicken during draw to improve visibility; configurable via previewWidthBoost
              ctx.lineWidth = (p.strokeWidth ?? 3) + (isSelected ? 0.5 : 0) + (draw ? (previewWidthBoost || 0) : 0);
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
      
      {/* Hand Follower Integration */}
      {React.useMemo(() => {
        const handFollowerSettings = obj.properties?.handFollower;
        
        // Only show hand follower during drawIn animation and when enabled
        if (obj.animationType !== 'drawIn' || progress >= 1) {
          return null;
        }
        
        if (!handFollowerSettings?.enabled) {
          return null;
        }
        
        // Get the first path for hand following (could be enhanced to follow specific path)
        const firstPath = paths[0];
        if (!firstPath?.d) {
          return null;
        }
        
        // Professional three-layer mode
        if (handFollowerSettings.mode === 'professional' && handFollowerSettings.handAsset && handFollowerSettings.toolAsset) {
          return (
            <ThreeLayerHandFollower
              key="hand-follower" // Add key for better React reconciliation
              pathData={firstPath.d}
              progress={progress}
              handAsset={handFollowerSettings.handAsset}
              toolAsset={handFollowerSettings.toolAsset}
              scale={handFollowerSettings.scale || 1}
              visible={handFollowerSettings.visible !== false}
              debug={false}
              mirror={!!handFollowerSettings.mirror}
              showForeground={handFollowerSettings.showForeground !== false}
              extraOffset={handFollowerSettings.calibrationOffset || handFollowerSettings.offset}
            />
          );
        }

        // Legacy single-image mode
        return (
          <HandFollower
            key="hand-follower-legacy" // Add key for better React reconciliation
            pathData={firstPath.d}
            progress={progress}
            handAsset={handFollowerSettings.handAsset || HandAssetManager.getDefaultHandAsset()}
            visible={handFollowerSettings.visible !== false}
            scale={handFollowerSettings.scale || 1}
            offset={handFollowerSettings.offset || { x: 0, y: 0 }}
          />
        );
      }, [obj.animationType, obj.properties?.handFollower, progress, paths])}
    </Group>
  );
};
