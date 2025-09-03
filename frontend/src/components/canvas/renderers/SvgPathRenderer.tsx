import React from 'react';
import { Group, Rect, Shape } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';
import { calculateAnimationProgress } from '../utils/animationUtils';
import ThreeLayerHandFollower from '../../hands/ThreeLayerHandFollower';
import { PathSampler } from '../../../utils/pathSampler';

// Note: splitSubpaths no longer used in this renderer

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
  
  // Check if we need to apply calibration offset to path drawing
  
  // Compute precise total length and drawable path information
  const { totalLen, drawablePaths } = React.useMemo(() => {
    const arr = Array.isArray(obj.properties?.paths) ? obj.properties.paths : [];
    
    // Use provided totalLen if available and valid
    if (typeof obj.properties?.totalLen === 'number' && obj.properties.totalLen > 0) {
      // Still need to compute individual path lengths for synchronization
      const drawablePathsTemp: any[] = [];
      
      arr.forEach((p: any, index: number) => {
        const d = p?.d as string | undefined;
        if (!d) return;
        
        if (!(p as any)._samples) {
          try {
            (p as any)._samples = PathSampler.samplePath(d, 1.25, (p?.m as number[] | undefined));
          } catch (error) {
            (p as any)._samples = [];
          }
        }
        const samples = (p as any)._samples as ReturnType<typeof PathSampler.samplePath>;
        const len = samples.length ? samples[samples.length - 1].cumulativeLength : 0;
        (p as any).len = len;
        
        if (len > 0) {
          drawablePathsTemp.push({ ...p, index, len });
        }
      });
      
      return {
        totalLen: obj.properties.totalLen,
        drawablePaths: drawablePathsTemp
      };
    }
    
    // Compute from scratch
    const drawablePathsTemp: any[] = [];
    let sum = 0;
    
    arr.forEach((p: any, index: number) => {
      const d = p?.d as string | undefined;
      if (!d) {
        if (obj.properties?.debug?.logRenderer) {
          console.warn('[SvgPathRenderer] Path missing d attribute:', p);
        }
        return;
      }
      
      // Validate SVG path data
      if (!d.trim().match(/^[MmLlHhVvCcSsQqTtAaZz0-9\s,.-]+$/)) {
        console.error('[SvgPathRenderer] Invalid SVG path data:', d);
        return;
      }
      
      // Compute path length using PathSampler
      if (!(p as any)._samples) {
        try {
          (p as any)._samples = PathSampler.samplePath(d, 1.25, (p?.m as number[] | undefined));
        } catch (error) {
          console.error('[SvgPathRenderer] PathSampler failed for path:', d, error);
          (p as any)._samples = [];
        }
      }
      const samples = (p as any)._samples as ReturnType<typeof PathSampler.samplePath>;
      const len = samples.length ? samples[samples.length - 1].cumulativeLength : 0;
      (p as any).len = len;
      
      if (len > 0) {
        drawablePathsTemp.push({ ...p, index, len });
        sum += len;
      } else if (obj.properties?.debug?.logRenderer) {
        console.warn('[SvgPathRenderer] Path has zero length:', { d, samples: samples.length, index });
      }
    });
    
    return {
      totalLen: sum,
      drawablePaths: drawablePathsTemp
    };
  }, [obj.properties?.paths, obj.properties?.totalLen, obj.properties?.debug?.logRenderer]);
  const draw = obj.animationType === 'drawIn';
  // const previewMode = !!obj.properties?.previewDraw;
  const drawOptions = obj.properties?.drawOptions || null;
  // const fillKind: 'afterAll' | 'perPath' | 'batched' = drawOptions?.fillStrategy?.kind
  //   || (previewMode ? 'perPath' : 'afterAll');
  // const batchesN = Math.max(2, Number(drawOptions?.fillStrategy?.batchesN || 4));
  // const previewStrokeColor = drawOptions?.previewStroke?.color || '#3b82f6';
  const previewWidthBoost = typeof drawOptions?.previewStroke?.widthBoost === 'number' ? drawOptions.previewStroke.widthBoost : 1;

  // Reveal length is tied to object's duration so timeline edits directly influence drawing speed
  const targetLen = draw ? progress * totalLen : totalLen;
  // Batched fill threshold (ensure last batch fills when complete)
  // const fraction = totalLen > 0 ? targetLen / totalLen : 1;
  // const clampedFraction = Math.max(0, Math.min(1, fraction));
  // const filledBatches = totalLen > 0 ? Math.floor(clampedFraction * batchesN + 1e-9) : 0; // 0..batchesN
  // const batchThreshold = (fillKind === 'batched' && totalLen > 0)
  //   ? (Math.min(filledBatches, batchesN) / batchesN) * totalLen
  //   : totalLen;
  // let consumed = 0;

  // Compute hand follower node once per relevant changes
  const handNode = React.useMemo(() => {
    const handFollowerSettings = obj.properties?.handFollower;
    if (!handFollowerSettings?.enabled) return null;

    // 🔧 SYNCHRONIZATION FIX: Use only drawable paths for hand follower calculation
    // This ensures hand animation and stroke rendering use the same path length basis
    
    let activePath: any | null = null;
    let localProgress = 0;
    let pathIndex = -1;
    
    if (drawablePaths.length > 0) {
      let used = 0;
      for (const drawablePath of drawablePaths) {
        const len = drawablePath.len;
        const start = used;
        const end = used + len;
        
        if (targetLen <= start) { 
          activePath = drawablePath; 
          localProgress = 0; 
          pathIndex = drawablePath.index;
          break; 
        }
        if (targetLen < end) {
          const localReveal = Math.max(0, targetLen - start);
          localProgress = len > 0 ? localReveal / len : 0;
          activePath = drawablePath; 
          pathIndex = drawablePath.index;
          break;
        }
        used = end;
      }
      
      // If no active path found, use the first drawable path
      if (!activePath && drawablePaths.length > 0) {
        activePath = drawablePaths[0];
        localProgress = 0;
        pathIndex = activePath.index;
      }
    }
    
    if (!activePath?.d) return null;

    // Simple debug logging to avoid interference
    if (obj.properties?.debug?.logRenderer && activePath) {
      const now = Date.now();
      const lastLogKey = `hand-debug-${obj.id}`;
      const lastLogTime = (window as any)[lastLogKey] || 0;
      
      if (now - lastLogTime > 1000) { // Rate limit to once per second
        (window as any)[lastLogKey] = now;
        console.log('🤚 [HAND DEBUG] Hand Follower', {
          pathIndex,
          localProgress: `${(localProgress * 100).toFixed(1)}%`,
          targetLen: `${targetLen.toFixed(1)} units`
        });
      }
    }

    if (handFollowerSettings.mode === 'professional' && handFollowerSettings.handAsset && handFollowerSettings.toolAsset) {
      const userBacktrack = typeof handFollowerSettings.tipBacktrackPx === 'number' ? handFollowerSettings.tipBacktrackPx : null;
      const cap = (activePath.strokeLinecap || activePath.lineCap || 'round') as 'round'|'butt'|'square';
      const logicalW = (activePath.strokeWidth ?? 3);
      const previewScale = 1 + ((previewWidthBoost || 0) / Math.max(1, logicalW));
      const capExt = (cap === 'round' || cap === 'square') ? 0.5 * logicalW : 0;
      const autoBacktrack = (capExt * previewScale) + 0.4 * logicalW;
      let tipBacktrackPx = draw ? Math.max(1, (userBacktrack ?? autoBacktrack)) : 0;

      try {
        if (draw && activePath?.d && activePath.len > 0) {
          const sampler = PathSampler.createCachedSampler(activePath.d as string, 2, activePath.m as number[] | undefined, 4000);
          const p = Math.max(0, Math.min(1, localProgress));
          const tLen = sampler.getTotalLength();
          if (tLen > 0) {
            const arc = Math.max(1.5, Math.min(8, logicalW * 0.8));
            const back = Math.max(0, (p * tLen - arc) / tLen);
            const fwd = Math.min(1, (p * tLen + arc) / tLen);
            const ang0 = sampler.getTangentAtProgress(back);
            const ang1 = sampler.getTangentAtProgress(p);
            const ang2 = sampler.getTangentAtProgress(fwd);
            const norm = (a:number)=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
            const d1 = norm(ang1 - ang0);
            const d2 = norm(ang2 - ang1);
            const totalAngleChange = Math.abs(d1) + Math.abs(d2);
            const kappa = totalAngleChange / Math.max(1e-3, (2*arc));
            const damping = Math.max(0.3, Math.min(1, 1 - 6 * kappa));
            tipBacktrackPx *= damping;
            
            // 🔍 Add curvature analysis logging
            if (obj.properties?.debug?.logRenderer) {
              // eslint-disable-next-line no-console
              console.log('🎯 [HAND DEBUG] Curvature Analysis', {
                id: obj.id,
                p: `${(p * 100).toFixed(1)}%`,
                tLen,
                arc,
                angles: { ang0, ang1, ang2 },
                angleChanges: { d1, d2, totalAngleChange },
                kappa,
                damping,
                tipBacktrackPx
              });
            }
          }
        }
      } catch (error) {
        if (obj.properties?.debug?.logRenderer) {
          console.error('🤚 [HAND DEBUG] Curvature calculation error:', error);
        }
      }

      return (
        <ThreeLayerHandFollower
          key="hand-follower"
          pathData={activePath.d}
          pathMatrix={activePath.m as number[] | undefined}
          progress={localProgress}
          tipBacktrackPx={tipBacktrackPx}
          handAsset={handFollowerSettings.handAsset}
          toolAsset={handFollowerSettings.toolAsset}
          scale={handFollowerSettings.scale || 1}
          visible={handFollowerSettings.visible !== false}
          debug={!!handFollowerSettings.debug}
          mirror={!!handFollowerSettings.mirror}
          showForeground={handFollowerSettings.showForeground !== false}
          extraOffset={handFollowerSettings.calibrationOffset || handFollowerSettings.offset || { x: 0, y: 0 }}
        />
      );
    }
    return null;
  }, [obj.properties?.handFollower, drawablePaths, targetLen, draw, previewWidthBoost, obj.id, obj.properties?.debug?.logRenderer]);

  // 📊 Simplified Debug Logs
  React.useEffect(() => {
    if (!obj.properties?.debug?.logRenderer) return;
    
    const now = Date.now();
    const logKey = `general-debug-${obj.id}`;
    const lastLogTime = (window as any)[logKey] || 0;
    
    // Rate limit: Log only every 2 seconds to avoid interference
    if (now - lastLogTime < 2000) return;
    
    (window as any)[logKey] = now;

    // Simple progress update
    console.log('📊 [SvgPathRenderer] Progress', {
      id: obj.id,
      progress: `${(progress * 100).toFixed(1)}%`,
      drawablePaths: drawablePaths.length,
      handFollowerEnabled: !!obj.properties?.handFollower?.enabled
    });
  }, [progress, drawablePaths, obj.id, obj.properties?.debug, obj.properties?.handFollower?.enabled]);

  // 🔍 Simplified Synchronization Debug
  React.useEffect(() => {
    if (!obj.properties?.debug?.logRenderer || !obj.properties?.handFollower?.enabled) return;

    const now = Date.now();
    const logKey = `sync-debug-${obj.id}`;
    const lastLogTime = (window as any)[logKey] || 0;
    
    // Only log every 2 seconds to avoid interference
    if (now - lastLogTime < 2000) return;
    
    (window as any)[logKey] = now;

    // Simple sync status
    console.log('🔍 [SYNC DEBUG] Animation Status', {
      progress: `${(progress * 100).toFixed(1)}%`,
      targetLen: `${targetLen.toFixed(1)} units`,
      totalLen: `${totalLen.toFixed(1)} units`,
      drawablePaths: drawablePaths.length,
      handFollowerEnabled: true
    });
  }, [progress, targetLen, totalLen, drawablePaths, obj.properties?.debug, obj.properties?.handFollower, obj.id]);

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
      {/* Stroke reveal renderer */}
      <Shape
        listening={false}
        __progress={progress}
        __targetLen={targetLen}
        sceneFunc={(ctx, shape) => {
          let used = 0;
          for (let i = 0; i < paths.length; i++) {
            const p: any = paths[i];
            const len = Math.max(0, Number(p.len || 0));
            const start = used;
            const end = used + len;
            used = end;

            if (len <= 0) {
              if (obj.properties?.debug?.logRenderer) {
                console.warn(`[SvgPathRenderer] [sceneFunc] Skipping path[${i}] - zero length`, { d: p.d, len });
              }
              continue;
            }

            const stroke = (p.stroke && p.stroke !== 'none' && p.stroke !== 'transparent') 
              ? p.stroke 
              : (obj.properties?.drawOptions?.previewStroke?.color || '#3b82f6');
            const width = (p.strokeWidth ?? 3) + (draw ? (typeof obj.properties?.drawOptions?.previewStroke?.widthBoost === 'number' ? obj.properties.drawOptions.previewStroke.widthBoost : 0) : 0);

            const visible = Math.max(0, Math.min(len, targetLen - start));
            if (visible <= 0) continue;
            
            const dStr = String(p.d || '');
            if (!dStr) {
              console.error(`[SvgPathRenderer] [sceneFunc] Path[${i}] has no d attribute`);
              continue;
            }
            
            let samples;
            try {
              samples = PathSampler.samplePath(dStr, 1.25, undefined);
            } catch (error) {
              console.error(`[SvgPathRenderer] [sceneFunc] PathSampler failed for path[${i}]:`, dStr, error);
              continue;
            }
            
            if (!samples.length) {
              console.warn(`[SvgPathRenderer] [sceneFunc] Path[${i}] generated no samples:`, dStr);
              continue;
            }

            if (obj.properties?.debug?.logRenderer) {
              // eslint-disable-next-line no-console
              console.log(`📏 [STROKE DEBUG] path[${i}] rendering`, {
                id: obj.id,
                pathIndex: i,
                d: p.d?.substring(0, 50) + '...',
                len: p.len,
                stroke,
                width,
                visible,
                progress,
                targetLen,
                start,
                end,
                samples: samples.length,
                firstSample: samples[0],
                lastSample: samples[samples.length - 1],
                
                // Stroke drawing details
                strokeProgress: len > 0 ? visible / len : 0,
                strokeProgressPercentage: len > 0 ? `${((visible / len) * 100).toFixed(1)}%` : '0%',
                isComplete: visible >= len,
                willFill: visible >= len && p.fill && p.fill !== 'none'
              });
            }

            ctx.save();
            const m = p?.m as number[] | undefined;
            if (m && m.length >= 6) ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = stroke;
            ctx.beginPath();

            let i0 = 0;
            ctx.moveTo(samples[0].x, samples[0].y);
            for (; i0 < samples.length && samples[i0].cumulativeLength <= visible; i0++) {
              if (i0 > 0) ctx.lineTo(samples[i0].x, samples[i0].y);
            }
            if (i0 < samples.length && i0 > 0) {
              const A = samples[i0 - 1], B = samples[i0];
              const t = (visible - A.cumulativeLength) / Math.max(1e-6, B.cumulativeLength - A.cumulativeLength);
              const x = A.x + t * (B.x - A.x);
              const y = A.y + t * (B.y - A.y);
              ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();

            if (visible >= len && p.fill && p.fill !== 'none') {
              try {
                ctx.save();
                const m = p?.m as number[] | undefined;
                if (m && m.length >= 6) ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
                const path2d = new Path2D(String(p.d || ''));
                ctx.fillStyle = p.fill;
                if (p.fillRule) ctx.fill(path2d, p.fillRule);
                else ctx.fill(path2d);
              } catch (fillError) {
                console.error(`[SvgPathRenderer] [sceneFunc] Fill failed for path[${i}]:`, fillError);
              }
              ctx.restore();
            }
          }
          shape.fillEnabled(false);
        }}
      />
  {handNode}
    </Group>
  );
};
